import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FF] px-4">
      <div className="glass-card rounded-2xl p-10 text-center max-w-md w-full">
        <div className="text-6xl mb-4 animate-float inline-block">🎓</div>
        <h1 className="font-fraunces text-3xl font-bold text-[#0B1340] mb-2">
          Page not found
        </h1>
        <p className="font-jakarta text-sm text-[#888888] mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="gold">Back to EdUmeetup</Button>
        </Link>
      </div>
    </div>
  )
}
