import { getParentViewData } from './actions'
import { ParentViewClient } from './parent-view-client'

interface PageProps {
    params: Promise<{ token: string }>
}

export const dynamic = 'force-dynamic'

export default async function ParentViewPage(props: PageProps) {
    const params = await props.params;
    const data = await getParentViewData(params.token)

    if (!data) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                        <span className="text-3xl">🔗</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
                    <p className="text-gray-500 text-sm">
                        This parent view link is no longer valid. Please ask your student to share a fresh link.
                    </p>
                </div>
            </main>
        )
    }

    return <ParentViewClient token={params.token} initialData={data} />
}
