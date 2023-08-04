import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About | shushuTona.com',
}

type Career = {
    start: string
    end: string
    desc: string
}

const careerHistory: Career[] = [
    {
        start: '2018年4月',
        end: '2020年12月',
        desc: '新宿のweb制作会社でフロントエンドエンジニアとして勤務していました。企業のコーポレートサイトのリニューアル案件を主に扱っていました。'
    },
    {
        start: '2021年1月',
        end: '',
        desc: '新宿の事業会社でwebエンジニアとして勤務しています。主に自社サービスのフロントエンドとバックエンド開発、AWSでのインフラ修正、エンジニア採用などを行っています。'
    },
]

export default function About() {
    return (
        <>
            <h1>About</h1>

            <h2>職務経歴</h2>
            <p>大学4年生の就職活動時にWebアプリケーション開発の勉強を始めて、以下の経歴で生きてきました。</p>

            <dl className='my-8'>
                {
                    careerHistory.map( ( career ) => {
                        const date = career.end === '' ? '現在' : career.end

                        return (
                            <div className="[&:nth-of-type(n+2)]:mt-6" key={career.desc}>
                                <dt>{career.start} ～ {date}</dt>
                                <dd className="mt-2 text-[0.875rem]">{career.desc}</dd>
                            </div>
                        )
                    })
                }
            </dl>
        </>
    )
}
