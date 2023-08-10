import { glob } from 'glob';
import { basename, dirname, join, parse } from 'path';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

import { ArticleMetaData } from '@/components/blog/articleMetaData';
import { ArticleList } from '@/components/blog/ArticleList';

const postDirectory = 'articles';

// mdファイル内容を文字列として取得する
const getArticleStringFromMDFile = ( year: string, fileName: string ): string => {
    const fullPath = join( postDirectory, year, fileName + '.md' );
    const file = readFileSync( fullPath, 'utf8' );

    return file;
}

export async function generateMetadata( { params }: { params: { tagName: string } } ) {
    return {
        title: params.tagName + 'の記事一覧 | shushuTona.com',
    }
}

// articlesディレクトリ内のmdファイル一覧を取得して、Blogコンポーネントのparamsに渡す配列を生成する。
export async function generateStaticParams() {
    const filePathList = glob.sync( 'articles/**/*.md', { nodir: true } );

    let tagNameList: string[] = [];
    filePathList.forEach( ( filePath ) => {
        const parseFile = parse( filePath );
        const year = basename( dirname( filePath ) );
        const fileName = parseFile.name;

        const file = getArticleStringFromMDFile( year, fileName );

        // gray-matterでmarkdownのメタデータとコンテンツデータをそれぞれ取得する
        const { data, content } = matter( file );
        const articleMetaData = data as ArticleMetaData;

        tagNameList = [...tagNameList, ...articleMetaData.tags];
    } );

    return Array.from( new Set( tagNameList ) ).map( ( tagName ) => {
        return {
            tagName,
        }
    }) ;
}

const TagPage = async ( { params }: { params: { tagName: string} } ) => {
    const filePathList = glob.sync( 'articles/**/*.md', { nodir: true } );

    const articleDataList = filePathList.map( ( filePath ) => {
        const file = readFileSync( filePath, 'utf8' );
        const { data, content } = matter( file );
        const articleMetaData = data as ArticleMetaData;

        const parseFile = parse( filePath )
        const articlePath = join( '/blog', basename( dirname( filePath ) ), parseFile.name );

        return {
            articleMetaData,
            articlePath,
            date: new Date( articleMetaData.created_at ),
        }
    } );

    // 記事の公開日が新しい順に並び替える & publishがtrueの記事だけを一覧に表示する
    const publishedArticleDataList = articleDataList
                                                            .sort( ( articleDataA, articleDataB ) => articleDataB.date.getTime() - articleDataA.date.getTime() )
                                                            .filter( ( articleData ) => articleData.articleMetaData.publish && articleData.articleMetaData.tags.includes( params.tagName ) );

    return (
        <>
            <h1>{params.tagName}の記事一覧</h1>

            <ArticleList articleList={publishedArticleDataList} headingLevel='2' classList='my-12' />
        </>
    )
}

// export const runtime = 'edge';

export default TagPage
