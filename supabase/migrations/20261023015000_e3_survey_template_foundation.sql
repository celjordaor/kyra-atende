-- E3 / P12.1: versioned survey templates. No public respondents or automated sends.
create table public.survey_templates (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 kind text not null check (kind in ('booking_experience','service_satisfaction')),
 title text not null check (char_length(trim(title)) between 3 and 120),
 version integer not null default 1 check (version > 0),
 status text not null default 'draft' check (status in ('draft','published','paused')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (tenant_id,id),
 unique (tenant_id,kind,version)
);
create table public.survey_questions (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 template_id uuid not null,
 position integer not null check(position between 1 and 30),
 label text not null check(char_length(trim(label)) between 3 and 250),
 answer_type text not null check(answer_type in ('rating_1_5','yes_no','short_text')),
 required boolean not null default true,
 created_at timestamptz not null default now(),
 foreign key (tenant_id,template_id) references public.survey_templates(tenant_id,id) on delete cascade,
 unique(template_id,position)
);
create index survey_templates_tenant_kind_idx on public.survey_templates(tenant_id,kind,created_at desc);
create index survey_questions_tenant_template_idx on public.survey_questions(tenant_id,template_id,position);
alter table public.survey_templates enable row level security;
alter table public.survey_questions enable row level security;
revoke all on public.survey_templates,public.survey_questions from public,anon,authenticated;
grant select,insert,update,delete on public.survey_templates,public.survey_questions to service_role;
-- All writes must be authorized in server API. There are no client-access RLS policies.
create or replace function public.create_survey_template(
 p_tenant uuid,p_author uuid,p_kind text,p_title text,p_questions jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_version integer; q jsonb; n integer:=0;
begin
 if current_user <> 'postgres' and current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
 then raise exception 'not authorized' using errcode='42501';end if;
 if p_kind not in ('booking_experience','service_satisfaction') or char_length(trim(coalesce(p_title,''))) not between 3 and 120
 or jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 20
 then raise exception 'invalid template' using errcode='22023';end if;
 if not exists(select 1 from public.profiles where id=p_author and tenant_id=p_tenant and role in ('owner','admin'))
 then raise exception 'no permission' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('survey:'||p_tenant::text||':'||p_kind,0));
 select coalesce(max(version),0)+1 into v_version from public.survey_templates where tenant_id=p_tenant and kind=p_kind;
 insert into public.survey_templates(tenant_id,kind,title,version,created_by)
 values(p_tenant,p_kind,trim(p_title),v_version,p_author) returning id into v_id;
 for q in select value from jsonb_array_elements(p_questions) loop
  n:=n+1;
  if jsonb_typeof(q) <> 'object'
   or jsonb_typeof(q->'label') <> 'string'
   or char_length(trim(q->>'label')) not between 3 and 250
   or (q->>'answer_type') not in ('rating_1_5','yes_no','short_text')
   or (q ? 'required' and jsonb_typeof(q->'required') <> 'boolean')
  then raise exception 'invalid question' using errcode='22023';end if;
  insert into public.survey_questions(tenant_id,template_id,position,label,answer_type,required)
  values(p_tenant,v_id,n,trim(q->>'label'),q->>'answer_type',coalesce((q->>'required')::boolean,true));
 end loop;
 return v_id;
end $$;
revoke all on function public.create_survey_template(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_survey_template(uuid,uuid,text,text,jsonb) to service_role;
