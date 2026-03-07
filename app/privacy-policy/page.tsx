import { redirect } from 'next/navigation'

// /privacy-policy → canonical /privacy
export default function PrivacyPolicyPage() {
    redirect('/privacy')
}
