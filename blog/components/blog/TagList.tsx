import Link from 'next/link';

const TagList = ( props: { tags: string[] } ) => {
    return (
        <ul className='flex gap-2'>
            {
                props.tags.map( ( tag ) => {
                    const href = '/blog/' + tag
                    return <li className='hoge' key={tag}>
                        <Link className='px-2 py-1 block bg-neutral-400 transition-[background-color] duration-500 hover:bg-neutral-300 text-sm no-underline rounded-[6px]' href={href}>#{tag}</Link>
                    </li>
                } )
            }
        </ul>
    )
}

export { TagList }
