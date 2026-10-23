import {createClient} from '@/lib/supabase/server'
import PortalSignIn from './PortalSignIn'
import ClaimInvitation from './ClaimInvitation'
import PortalOverview from './PortalOverview'

export const metadata={title:'Portal do Cliente — Kyra Atende',robots:{index:false,follow:false}}

export default async function CustomerPortal(){
 const {data:{user},error}=await createClient().auth.getUser()
 if(error||!user?.email_confirmed_at||!user.email){
  return <main style={{maxWidth:560,margin:'48px auto',padding:24}}>
   <h1>Portal do Cliente</h1>
   <p>Acesse com um código de verificação enviado para seu e-mail.</p>
   <PortalSignIn/>
  </main>
 }
 return <main style={{maxWidth:780,margin:'48px auto',padding:24}}>
  <h1>Portal do Cliente</h1>
  <p>Conta verificada: {user.email}</p>
  <PortalOverview/>
  <ClaimInvitation/>
 </main>
}
