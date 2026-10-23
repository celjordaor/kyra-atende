import SurveyRespondClient from './SurveyRespondClient'
export const metadata={title:'Pesquisa — Kyra Atende',referrer:'no-referrer',robots:{index:false,follow:false}}
export default async function SurveyPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params
 return <SurveyRespondClient token={token}/>
}
