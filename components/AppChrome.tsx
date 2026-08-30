'use client'
import {usePathname} from 'next/navigation';import {Sidebar} from './Sidebar';import {Topbar} from './Topbar'
export default function AppChrome({children}:{children:React.ReactNode}){const path=usePathname(),isPublic=path==='/anfrage'||path.startsWith('/angebot/');if(isPublic)return <>{children}</>;return <div className="shell"><Sidebar/><div className="main"><Topbar/><main className="content">{children}</main></div></div>}

