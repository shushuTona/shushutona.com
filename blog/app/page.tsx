import { Metadata } from 'next';

import { glob } from 'glob';
import { basename, dirname, join, parse } from 'path';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

import { ArticleMetaData } from '@/components/blog/articleMetaData';
import { ArticleList } from '@/components/blog/ArticleList';

export const metadata: Metadata = {
  title: 'shushuTona.com',
}

const Home = () => {
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
                                                            .filter( ( articleData ) => articleData.articleMetaData.publish );

    return (
        <>
            <h1>shushuTona.com</h1>

            <ArticleList articleList={publishedArticleDataList} headingLevel='2' classList='my-12' />
        </>
    )
}

export default Home;
