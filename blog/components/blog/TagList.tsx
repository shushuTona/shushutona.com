import Link from 'next/link';

const TagList = ( props: { tags: string[], classList?: string } ) => {
    return (
        <ul className={'flex gap-2 text-xs ' + props.classList}>
            {
                props.tags.map( ( tag ) => {
                    const href = '/tag/' + tag
                    return <li key={tag}>
                        <Link className='px-2 py-1 block leading-tight bg-neutral-300 transition-[background-color] duration-500 hover:bg-neutral-200 no-underline rounded-[6px]' href={href}>#{tag}</Link>
                    </li>
                } )
            }
        </ul>
    )
}

export { TagList }
