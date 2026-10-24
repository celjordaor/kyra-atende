import type {ReactNode} from 'react'
/** Shared E1 visual treatment for General, Subscription, Hours, Notifications and Plan settings. */
export default function ConfiguracoesLayout({children}:{children:ReactNode}){
 return <div className="kyra-e1-workspace kyra-e1-settings">{children}</div>
}
