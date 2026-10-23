import {createClient} from '@/lib/supabase/server'
import {redirect} from 'next/navigation'
import SurveyTemplatesClient from './SurveyTemplatesClient'
export const metadata={title:'Pesquisas — Kyra Atende'}
export default async function PesquisasPage(){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user)redirect('/login')
 return <SurveyTemplatesClient/>
}
