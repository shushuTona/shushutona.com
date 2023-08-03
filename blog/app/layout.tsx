import './globals.css'
import { Inter } from 'next/font/google'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.className}>
      <body className="min-h-screen grid grid-rows-[auto_1fr_auto]">
        <Header />

        <main className='min-w-0'>
          <div className="main mx-auto p-4 w-full max-w-[1000px] h-full">
            {children}
          </div>
        </main>

        <Footer />
      </body>
    </html>
  )
}
