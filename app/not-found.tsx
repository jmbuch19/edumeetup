import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
            <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
            <p className="text-gray-500 mb-8 max-w-md">
                The page you are looking for doesn&apos;t exist or has been moved.
            </p>
            <Link href="/">
                <Button>Return Home</Button>
            </Link>
        </div>
    )
}
