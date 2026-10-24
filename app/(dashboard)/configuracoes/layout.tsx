import type {ReactNode} from 'react'
import ConfiguracoesHeader from './ConfiguracoesHeader'
export default function ConfiguracoesLayout({children}:{children:ReactNode}){
 return <div className="kyra-e1-workspace kyra-e1-settings kyra-settings-unified">
  <ConfiguracoesHeader/>
  <div className="kyra-settings-content">{children}</div>
 </div>
}
