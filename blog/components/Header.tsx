import Link from 'next/link'

const Header = () => {
    return (
        <header>
            <nav className="mx-auto p-4 w-full max-w-[1000px] flex items-center flex-row">
                <p className="py-4">
                    <Link
                        href="/"
                        className="flex items-center relative pl-[40px] h-[30px] leading-none before:content-[''] before:w-[30px] before:h-[30px] before:bg-[url('/blog_icon.svg')] before:bg-contain before:absolute before:top-0 before:left-0">
                        shushuTona.com
                    </Link>
                </p>

                <ul className="flex gap-x-4 ml-auto leading-none">
                    <li>
                        <Link href="/about">About</Link>
                    </li>
                    <li>
                        <a href="https://github.com/shushuTona" target="_blank" rel="noopener noreferrer">Github</a>
                    </li>
                </ul>
            </nav>
        </header>
    )
}

export { Header }
