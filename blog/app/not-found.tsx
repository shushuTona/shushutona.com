import Link from 'next/link'

export default async function NotFound() {
  return (
    <>
      <h1>Not Found</h1>
      <p>Could not find requested resource</p>
      <p>View <Link href="/">All posts</Link></p>
    </>
  )
}