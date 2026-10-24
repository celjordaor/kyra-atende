'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
const tabs=[{href:'/configuracoes',label:'Geral'},{href:'/configuracoes/assinatura',label:'Assinatura'},{href:'/configuracoes/horarios',label:'Horários'},{href:'/configuracoes/notificacoes',label:'Notificações'}]
export default function ConfiguracoesHeader(){
 const pathname=usePathname()
 return <header className="kyra-settings-unified-header">
  <h1>Configurações</h1>
  <p>Gerencie os dados da empresa, assinatura, horários e notificações.</p>
  <nav className="kyra-settings-tabs" aria-label="Seções de configurações">
   {tabs.map(tab=><Link key={tab.href} href={tab.href} aria-current={pathname===tab.href?'page':undefined}>{tab.label}</Link>)}
  </nav>
 </header>
}
