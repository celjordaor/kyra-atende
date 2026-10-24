import {createClient} from '@/lib/supabase/server'
import {redirect} from 'next/navigation'
import HorariosClient from './HorariosClient'
import ProfissionaisHorarios from './ProfissionaisHorarios'
import BloqueiosClient from './BloqueiosClient'
export const metadata={title:'Horários e disponibilidade — Kyra Atende'}
export default async function HorariosPage(){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user)redirect('/login')
 return <main style={{display:'flex',flexDirection:'column',gap:18,width:'100%'}}>
  <HorariosClient/>
  <ProfissionaisHorarios/>
  <BloqueiosClient/>
 </main>
}