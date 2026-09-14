'use client'

import React, { useState } from 'react'

const FEATURES = [
  { emoji: '📅', title: 'Agenda online 24h', desc: 'Seus clientes agendam pelo WhatsApp ou link próprio, a qualquer hora — sem telefonemas.' },
  { emoji: '💬', title: 'WhatsApp automático', desc: 'Confirmações, lembretes e pós-atendimento enviados sem você precisar tocar no celular.' },
  { emoji: '🤖', title: 'IA que atende', desc: 'Responde dúvidas, sugere horários e agenda por você. Seu negócio funciona enquanto você trabalha.' },
  { emoji: '📊', title: 'Relatórios reais', desc: 'Receita, taxa de retorno e faltas — tudo em uma tela. Tome decisões com dados, não com feeling.' },
  { emoji: '🔔', title: 'Notificações push', desc: 'Novo agendamento no celular em segundos. Sem precisar abrir o app — chega direto na tela.' },
  { emoji: '🏢', title: 'Multi-unidades', desc: 'Gerencie várias unidades em um só painel. Ideal para redes e franquias em crescimento.' },
]

const PLANS = [
  { name: 'Essencial', price: 49, desc: 'Para quem está começando.', features: ['Até 3 profissionais', 'Agenda online', '1 canal de atendimento', '50 msg de IA/mês', 'Histórico 30 dias'], cta: 'Começar grátis', highlight: false },
  { name: 'Cresce', price: 89, desc: 'Para negócios em crescimento.', features: ['Profissionais ilimitados', 'Relatórios avançados', '2 canais', '200 msg de IA/mês', 'Histórico 90 dias'], cta: 'Começar grátis', highlight: false },
  { name: 'Expande', price: 149, desc: 'Com WhatsApp e IA integrados.', features: ['Tudo do Cresce', 'WhatsApp (500 msg/mês)', 'IA de agendamento', 'Até 3 unidades', 'Histórico 180 dias'], cta: 'Começar grátis', highlight: true, badge: '⭐ Mais popular' },
  { name: 'Enterprise', price: 269, desc: 'Para redes e franquias.', features: ['Tudo do Expande', 'WhatsApp dedicado (2k msg)', 'Unidades ilimitadas', 'API + Webhooks', 'Suporte dedicado'], cta: 'Falar com vendas', highlight: false },
]

const TESTIMONIALS = [
  { text: 'Reduzi 80% das faltas. Meus clientes adoram agendar pelo WhatsApp sem precisar me ligar.', author: 'Ana Beatriz', role: 'Studio AB · São Paulo' },
  { text: 'Em 2 semanas já recuperei o investimento. O lembrete automático mudou tudo no meu salão.', author: 'Carlos Menezes', role: 'Barbearia Vintage · Belo Horizonte' },
  { text: 'Agora consigo ver quais serviços dão mais lucro. Nunca tive isso antes de forma tão simples.', author: 'Fernanda Lima', role: 'Espaço Wellness · Rio de Janeiro' },
]

function NavBar() {
  return (
    <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)', padding:'0 max(24px, calc((100vw - 1120px) / 2))', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
      <a href="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
        <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:'16px', fontWeight:800, color:'var(--white)' }}>K</span>
        </div>
        <span style={{ fontSize:'17px', fontWeight:700, color:'var(--ink)', letterSpacing:'-0.3px' }}>Kyra Atende</span>
      </a>
      <nav className="kyra-nav-lp" style={{ display:'flex', alignItems:'center', gap:'28px' }}>
        {['Funcionalidades','Preços','Depoimentos'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize:'14px', color:'var(--ink-soft)', textDecoration:'none', fontWeight:500 }}>{item}</a>
        ))}
      </nav>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <a href="/login" style={{ fontSize:'14px', color:'var(--ink-soft)', textDecoration:'none', fontWeight:500 }}>Entrar</a>
        <a href="/cadastro" style={{ padding:'8px 18px', borderRadius:'var(--r)', background:'var(--brand)', color:'var(--white)', fontSize:'14px', fontWeight:600, textDecoration:'none' }}>Teste grátis</a>
      </div>
      <style>{`@media (max-width:640px) { .kyra-nav-lp { display:none !important; } }`}</style>
    </header>
  )
}

function Hero() {
  const statCards = [
    { label:'Agend. hoje', value:'12', color:'var(--brand)' },
    { label:'Novos clientes', value:'34', color:'var(--green)' },
    { label:'Confirmação', value:'94%', color:'var(--green)' },
    { label:'Faltas', value:'2', color:'var(--orange)' },
  ]
  const rows = ['Mariana Costa · Corte + Escova · 09:30','Patricia Alves · Manicure · 11:00','Renata Souza · Hidratação · 14:00']
  return (
    <section style={{ padding:'80px max(24px, calc((100vw - 1120px) / 2)) 64px', textAlign:'center', background:'linear-gradient(180deg, var(--brand-faint) 0%, var(--surface) 100%)' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 14px', borderRadius:'100px', background:'var(--brand-dim)', marginBottom:'24px', fontSize:'13px', fontWeight:500, color:'var(--brand)' }}>
        🚀 Teste grátis por 14 dias · Sem cartão de crédito
      </div>
      <h1 style={{ fontSize:'clamp(32px, 5vw, 56px)', fontWeight:700, color:'var(--ink)', lineHeight:1.15, letterSpacing:'-1px', margin:'0 auto 20px', maxWidth:'780px' }}>
        O sistema de agendamento que{' '}<span style={{ color:'var(--brand)' }}>seus clientes adoram usar</span>
      </h1>
      <p style={{ fontSize:'18px', color:'var(--ink-soft)', lineHeight:1.6, margin:'0 auto 40px', maxWidth:'560px' }}>
        Agenda online, WhatsApp automático e IA que agenda por você. Para salões, clínicas, barbearias e spas que querem crescer sem complicar.
      </p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', flexWrap:'wrap' }}>
        <a href="/cadastro" style={{ padding:'14px 32px', borderRadius:'var(--r)', background:'var(--brand)', color:'var(--white)', fontSize:'16px', fontWeight:600, textDecoration:'none', boxShadow:'0 4px 14px rgba(30,110,245,0.35)' }}>Começar grátis agora</a>
        <a href="/agendar/demo" style={{ padding:'14px 28px', borderRadius:'var(--r)', background:'var(--surface-2)', color:'var(--ink)', fontSize:'16px', fontWeight:500, textDecoration:'none', border:'1px solid var(--border)' }}>Ver demo →</a>
      </div>
      <p style={{ marginTop:'28px', fontSize:'13px', color:'var(--muted)' }}>Mais de <strong style={{ color:'var(--ink)' }}>2.400 empresas</strong> já usam a Kyra Atende</p>
      <div style={{ marginTop:'56px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', boxShadow:'0 24px 64px rgba(0,0,0,0.08)', overflow:'hidden', maxWidth:'880px', marginInline:'auto' }}>
        <div style={{ background:'var(--surface-3)', padding:'12px 16px', display:'flex', alignItems:'center', gap:'8px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', gap:'6px' }}>
            {['#EF4444','#F59E0B','#10B981'].map((c) => <div key={c} style={{ width:'10px', height:'10px', borderRadius:'50%', background:c }} />)}
          </div>
          <div style={{ flex:1, background:'var(--surface-2)', borderRadius:'4px', height:'22px', maxWidth:'320px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'11px', color:'var(--muted)' }}>kyra.app/dashboard</span>
          </div>
        </div>
        <div style={{ padding:'24px', background:'var(--surface)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
            {statCards.map((s) => (
              <div key={s.label} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px' }}>
                <div style={{ fontSize:'22px', fontWeight:700, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'var(--ink)', marginBottom:'12px' }}>Próximos agendamentos</div>
            {rows.map((row) => (
              <div key={row} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:'13px', color:'var(--ink-body)' }}>{row}</span>
                <span style={{ fontSize:'11px', fontWeight:500, color:'var(--green)', background:'var(--green-faint)', padding:'2px 8px', borderRadius:'100px' }}>Confirmado</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="funcionalidades" style={{ padding:'80px max(24px, calc((100vw - 1120px) / 2))', background:'var(--surface)' }}>
      <div style={{ textAlign:'center', marginBottom:'56px' }}>
        <h2 style={{ fontSize:'clamp(26px, 3.5vw, 38px)', fontWeight:700, color:'var(--ink)', margin:'0 0 12px', letterSpacing:'-0.5px' }}>Tudo que você precisa, sem complicação</h2>
        <p style={{ fontSize:'16px', color:'var(--ink-soft)', margin:0, maxWidth:'480px', marginInline:'auto' }}>Desenvolvido para o dia a dia de quem trabalha com atendimento no Brasil.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'24px' }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'28px 24px' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>{f.emoji}</div>
            <h3 style={{ fontSize:'17px', fontWeight:600, color:'var(--ink)', margin:'0 0 8px' }}>{f.title}</h3>
            <p style={{ fontSize:'14px', color:'var(--ink-soft)', margin:0, lineHeight:1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Pricing() {
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly')
  const discount = billing === 'annual' ? 0.8 : 1
  return (
    <section id="preços" style={{ padding:'80px max(24px, calc((100vw - 1120px) / 2))', background:'var(--surface-3)' }}>
      <div style={{ textAlign:'center', marginBottom:'48px' }}>
        <h2 style={{ fontSize:'clamp(26px, 3.5vw, 38px)', fontWeight:700, color:'var(--ink)', margin:'0 0 12px', letterSpacing:'-0.5px' }}>Planos para cada momento do negócio</h2>
        <p style={{ fontSize:'16px', color:'var(--ink-soft)', margin:'0 0 24px' }}>14 dias de teste grátis no plano Cresce. Sem cartão de crédito.</p>
        <div style={{ display:'inline-flex', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'4px', gap:'4px' }}>
          {(['monthly','annual'] as const).map((b) => (
            <button key={b} onClick={() => setBilling(b)} style={{ padding:'7px 20px', borderRadius:'5px', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:500, background: billing===b ? 'var(--brand)' : 'transparent', color: billing===b ? 'var(--white)' : 'var(--ink-soft)', transition:'all 0.15s' }}>
              {b === 'monthly' ? 'Mensal' : 'Anual −20%'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'20px' }}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={{ background: plan.highlight ? 'var(--brand)' : 'var(--surface-2)', border: plan.highlight ? '2px solid var(--brand)' : '1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'28px 24px', display:'flex', flexDirection:'column', gap:'20px', boxShadow: plan.highlight ? '0 8px 32px rgba(30,110,245,0.25)' : 'none', transform: plan.highlight ? 'scale(1.02)' : 'none' }}>
            <div>
              {'badge' in plan && plan.badge && <div style={{ fontSize:'12px', fontWeight:600, color:'var(--white)', background:'rgba(255,255,255,0.2)', borderRadius:'100px', padding:'3px 10px', display:'inline-block', marginBottom:'10px' }}>{plan.badge}</div>}
              <div style={{ fontSize:'20px', fontWeight:700, color: plan.highlight ? 'var(--white)' : 'var(--ink)' }}>{plan.name}</div>
              <div style={{ fontSize:'13px', color: plan.highlight ? 'rgba(255,255,255,0.75)' : 'var(--muted)', marginTop:'4px' }}>{plan.desc}</div>
            </div>
            <div>
              <span style={{ fontSize:'38px', fontWeight:800, color: plan.highlight ? 'var(--white)' : 'var(--ink)', letterSpacing:'-1px' }}>R${Math.round(plan.price * discount)}</span>
              <span style={{ fontSize:'14px', color: plan.highlight ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>/mês</span>
            </div>
            <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:'10px', flex:1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'14px', color: plan.highlight ? 'rgba(255,255,255,0.9)' : 'var(--ink-body)' }}>
                  <span style={{ color: plan.highlight ? 'var(--white)' : 'var(--green)', flexShrink:0, fontWeight:700 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <a href="/cadastro" style={{ display:'block', textAlign:'center', padding:'12px', borderRadius:'var(--r)', background: plan.highlight ? 'var(--white)' : 'var(--brand)', color: plan.highlight ? 'var(--brand)' : 'var(--white)', fontSize:'14px', fontWeight:600, textDecoration:'none' }}>{plan.cta}</a>
          </div>
        ))}
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section id="depoimentos" style={{ padding:'80px max(24px, calc((100vw - 1120px) / 2))', background:'var(--surface)' }}>
      <div style={{ textAlign:'center', marginBottom:'48px' }}>
        <h2 style={{ fontSize:'clamp(26px, 3.5vw, 38px)', fontWeight:700, color:'var(--ink)', margin:'0 0 12px', letterSpacing:'-0.5px' }}>Quem já usa, não volta atrás</h2>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'24px' }}>
        {TESTIMONIALS.map((t) => (
          <blockquote key={t.author} style={{ margin:0, padding:'28px 24px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>
            <p style={{ fontSize:'15px', color:'var(--ink-body)', lineHeight:1.7, margin:'0 0 20px', fontStyle:'italic' }}>&ldquo;{t.text}&rdquo;</p>
            <footer>
              <div style={{ fontSize:'14px', fontWeight:600, color:'var(--ink)' }}>{t.author}</div>
              <div style={{ fontSize:'13px', color:'var(--muted)', marginTop:'2px' }}>{t.role}</div>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section style={{ padding:'80px max(24px, calc((100vw - 1120px) / 2))', background:'linear-gradient(135deg, var(--brand) 0%, var(--brand-active) 100%)', textAlign:'center' }}>
      <h2 style={{ fontSize:'clamp(26px, 3.5vw, 40px)', fontWeight:700, color:'var(--white)', margin:'0 0 16px', letterSpacing:'-0.5px' }}>Pronto para reduzir faltas e lotar sua agenda?</h2>
      <p style={{ fontSize:'17px', color:'rgba(255,255,255,0.8)', margin:'0 0 36px' }}>14 dias grátis. Configure em 5 minutos. Cancele quando quiser.</p>
      <a href="/cadastro" style={{ display:'inline-block', padding:'16px 40px', borderRadius:'var(--r)', background:'var(--white)', color:'var(--brand)', fontSize:'16px', fontWeight:700, textDecoration:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
        Criar minha conta grátis →
      </a>
    </section>
  )
}

function Footer() {
  const links = [
    { label:'Privacidade', href:'/politica-de-privacidade' },
    { label:'Termos', href:'/termos' },
    { label:'Entrar', href:'/login' },
    { label:'Criar conta', href:'/cadastro' },
  ]
  return (
    <footer style={{ padding:'32px max(24px, calc((100vw - 1120px) / 2))', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'28px', height:'28px', borderRadius:'7px', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:'13px', fontWeight:800, color:'var(--white)' }}>K</span>
        </div>
        <span style={{ color:'rgba(255,255,255,0.9)', fontWeight:600 }}>Kyra Atende</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
      <div style={{ display:'flex', gap:'24px', flexWrap:'wrap' }}>
        {links.map((l) => <a key={l.label} href={l.href} style={{ color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>{l.label}</a>)}
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--surface)' }}>
      <NavBar />
      <main style={{ flex:1 }}>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
