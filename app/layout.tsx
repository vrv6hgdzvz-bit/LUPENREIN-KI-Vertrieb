import './globals.css'
import {Sidebar} from '@/components/Sidebar'
import {Topbar} from '@/components/Topbar'
export const metadata={title:'LUPENREIN KI Vertrieb',description:'Interne KI-Vertriebssoftware'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><body><div className="shell"><Sidebar/><div className="main"><Topbar/><main className="content">{children}</main></div></div></body></html>}
