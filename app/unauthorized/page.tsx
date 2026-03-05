export default function UnauthorizedPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-950 px-6">
            <div className="text-center">
                <p className="text-5xl mb-4">🔒</p>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-gray-400 text-sm mb-6">
                    You don&apos;t have permission to view this page.
                </p>
                <a
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                    ← Go Home
                </a>
            </div>
        </main>
    )
}
