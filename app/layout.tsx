import './globals.css'
import './lupenrein-brand.css'
import AppChrome from '@/components/AppChrome'
export const metadata={title:'LUPENREIN KI Vertrieb',description:'Interne KI-Vertriebssoftware'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><body><AppChrome>{children}</AppChrome></body></html>}

