import Link from 'next/link';

import { TagList } from '@/components/blog/TagList';
import { DateList } from '@/components/blog/DateList';
import { ArticleMetaData } from '@/components/blog/articleMetaData';

type Article = {
    articleMetaData: ArticleMetaData;
    articlePath: string;
}

const ArticleList = ( props: { articleList: Article[], headingLevel: string, classList?: string } ) => {
    const headingClass = props.headingLevel === '2' ? 'text-xl' : 'text-base';
    const itemClass = props.headingLevel === '2' ? '[&:nth-of-type(n+2)]:pt-8 [&:nth-of-type(n+2)]:mt-8' : '[&:nth-of-type(n+2)]:pt-6 [&:nth-of-type(n+2)]:mt-6';
    const dateListClass = props.headingLevel === '2' ? 'my-4' : 'my-2';
    const CustomTag = `h${props.headingLevel}` as keyof JSX.IntrinsicElements;

    return (
        <ul className={props.classList}>
            {
                props.articleList.map( ( { articleMetaData, articlePath } ) => {
                    return (
                        <li key={articleMetaData.title} className={'[&:nth-of-type(n+2)]:border-solid [&:nth-of-type(n+2)]:border-t [&:nth-of-type(n+2)]:border-t-[#350391] ' + itemClass}>
                            <CustomTag className={'m-0 ' + headingClass}>
                                <Link href={articlePath}>{articleMetaData.title}</Link>
                            </CustomTag>

                            <DateList created_at={articleMetaData.created_at} updated_at={articleMetaData.updated_at} classList={dateListClass} />

                            <TagList tags={articleMetaData.tags} classList='m-0' />
                        </li>
                    )
                } )
            }
        </ul>
    )
}

export { ArticleList }
