import Link from 'next/link';

const TagList = ( props: { tags: string[], classList?: string } ) => {
    return (
        <ul className={'flex gap-2 ' + props.classList}>
            {
                props.tags.map( ( tag ) => {
                    const href = '/blog/' + tag
                    return <li key={tag}>
                        <Link className='px-2 py-1 block bg-neutral-300 transition-[background-color] duration-500 hover:bg-neutral-200 text-sm no-underline rounded-[6px]' href={href}>#{tag}</Link>
                    </li>
                } )
            }
        </ul>
    )
}

export { TagList }
