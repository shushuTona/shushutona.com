import { glob } from 'glob';
import { basename, dirname, join, parse } from 'path';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSlug from 'remark-slug';
import remarkBreaks from 'remark-breaks';
import remarkExternalLinks from 'remark-external-links';
import rehypeFormat from 'rehype-format';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

import { TagList } from '@/components/blog/TagList';
import { DateList } from '@/components/blog/DateList';
import { ArticleMetaData } from '@/components/blog/articleMetaData';

// 記事内のコードハイライトCSS
import 'highlight.js/styles/tomorrow-night-bright.css';

type BlogParams = {
    year: string,
    fileName: string
}

const postDirectory = 'articles';

// mdファイル内容を文字列として取得する
const getArticleStringFromMDFile = ( year: string, fileName: string ): string => {
    const fullPath = join( postDirectory, year, fileName + '.md' );
    const file = readFileSync( fullPath, 'utf8' );

    return file;
}

// markdown文字列をHTML文字列に変換する
const convertMarkdownToHTML = async ( markdown: string ) => {
    const file = await unified()
        .use( remarkParse )
        .use( remarkSlug )
        .use( remarkBreaks )
        .use( remarkExternalLinks, {
            rel: ['nofollow', 'noopener', 'noreferrer'],
        } )
        .use( remarkRehype )
        .use( rehypeHighlight )
        .use( rehypeFormat )
        .use( rehypeStringify )
        .process( markdown );

    return String( file );
}

export async function generateMetadata( { params }: { params: BlogParams } ) {
    const file = getArticleStringFromMDFile( params.year, params.fileName );

    // gray-matterでmarkdownのメタデータとコンテンツデータをそれぞれ取得する
    const { data, content } = matter( file );
    const articleMetaData = data as ArticleMetaData;

    return {
        title: articleMetaData.title + ' | shushuTona.com',
    }
}

// articlesディレクトリ内のmdファイル一覧を取得して、Blogコンポーネントのparamsに渡す配列を生成する。
export async function generateStaticParams() {
    const filePathList = glob.sync( postDirectory + '/**/*.md', { nodir: true } );

    return filePathList.map( ( filePath ) => {
        const parseFile = parse( filePath );
        const year = basename( dirname( filePath ) );
        const fileName = parseFile.name;

        return {
            year,
            fileName,
        }
    } );
}

const Blog = async ( { params }: { params: BlogParams } ) => {
    const file = getArticleStringFromMDFile( params.year, params.fileName );

    // gray-matterでmarkdownのメタデータとコンテンツデータをそれぞれ取得する
    const { data, content } = matter( file );
    const articleMetaData = data as ArticleMetaData;

    // markdownをHTML文字列に変換する
    const articleHTML = await convertMarkdownToHTML( content );
    
    return (
        <>
            <h1>{articleMetaData.title}</h1>

            <DateList created_at={articleMetaData.created_at} updated_at={articleMetaData.updated_at} classList='my-5' />

            <TagList tags={articleMetaData.tags} classList='my-4' />

            <article className='mt-10' dangerouslySetInnerHTML={{ __html: articleHTML }}></article>
        </>
    )
}

export const runtime = 'edge';

export default Blog
