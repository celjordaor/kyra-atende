/**
 * Transactional booking cancellation email, shared by individual and batch cancellation.
 * Public portal sign-in verifies email with OTP; never put customer tokens in mail URLs.
 */
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
export function cancellationEmail({company,clientName,startAt}:{company:string;clientName:string;startAt:string}){
 const when=new Date(startAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'})
 const portal='https://www.kyraatende.com.br/portal'
 const logo='https://www.kyraatende.com.br/brand/kyra-atende-icon.svg?v=2'
 return {
  subject:'Cancelamento de agendamento — '+company,
  html:`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f2f9;font-family:Arial,Helvetica,sans-serif;color:#352c48">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f2f9"><tr><td align="center" style="padding:36px 16px">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e5dced;border-radius:16px;overflow:hidden">
<tr><td style="background:#4a3f66;padding:24px 30px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td valign="middle"><img src="${logo}" width="44" height="44" alt="Kyra Atende" style="display:block;width:44px;height:44px;border:0"></td><td valign="middle" style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:700">Kyra Atende</td></tr></table></td></tr>
<tr><td style="padding:34px 30px 30px"><div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#78658f;margin-bottom:14px">Atualização da sua agenda</div>
<h1 style="font-size:24px;line-height:1.3;color:#4a3f66;margin:0 0 20px">Agendamento cancelado</h1>
<p style="font-size:15px;line-height:1.65;margin:0 0 15px">Olá, ${escapeHtml(clientName||'cliente')}.</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 20px">Seu agendamento no estabelecimento <strong>${escapeHtml(company)}</strong> foi cancelado.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f2fa;border-radius:10px;border:1px solid #e7deee"><tr><td style="padding:18px 20px"><div style="font-size:12px;color:#756888;margin-bottom:7px">Data e horário do agendamento</div><div style="font-size:17px;font-weight:700;color:#4a3f66">${escapeHtml(when)}</div></td></tr></table>
<p style="font-size:15px;line-height:1.65;margin:23px 0">Para consultar suas informações ou acompanhar seus agendamentos, acesse o Portal do Cliente.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#695482" style="border-radius:9px"><a href="${portal}" style="display:inline-block;padding:14px 25px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9px">Acessar Portal do Cliente</a></td></tr></table>
<p style="font-size:12px;line-height:1.6;color:#82758d;margin:17px 0 0">O portal utiliza verificação por e-mail para proteger seus dados. Caso precise reagendar, consulte as opções disponíveis ou entre em contato com o estabelecimento.</p>
</td></tr>
<tr><td style="background:#faf8fc;border-top:1px solid #eee7f4;padding:20px 30px;text-align:center;color:#8a7d98;font-size:12px;line-height:1.6">Enviado por Kyra Atende em nome de ${escapeHtml(company)}.<br>Mensagem automática sobre um agendamento existente.</td></tr>
</table></td></tr></table></body></html>`,
  text:`Olá, ${clientName||'cliente'}. Seu agendamento de ${when} em ${company} foi cancelado. Consulte o Portal do Cliente: ${portal}. O acesso requer verificação por e-mail.`,
 }
}
