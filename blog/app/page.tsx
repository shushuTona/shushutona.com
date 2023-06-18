import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'shushuTona Blog',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>shushuTona Blog</h1>
    </main>
  )
}
