const DateList = ( props: { created_at: string, updated_at: string, classList?: string } ) => {
    return (
        <dl className={'flex gap-3 text-sm ' + props.classList}>
            <div className='flex'>
                <dt>公開日：</dt>
                <dd>{props.created_at}</dd>
            </div>
            {
                // 作成日から更新が発生している場合、更新日も表示する
                ( props.created_at !== props.updated_at ) && (
                    <div className='flex'>
                        <dt>更新日：</dt>
                        <dd>{props.updated_at}</dd>
                    </div>
                )
            }
        </dl>
    )
}

export { DateList }
