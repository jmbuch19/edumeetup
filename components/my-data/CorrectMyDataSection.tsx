import { Edit3, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface CorrectMyDataSectionProps {
    profileComponent?: React.ReactNode
    profileSettingsHref?: string
}

export default function CorrectMyDataSection({ profileComponent, profileSettingsHref = '/student/profile' }: CorrectMyDataSectionProps) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-sky-600" />
                    Correct My Data
                </h3>
                <p className="text-sm text-slate-500">
                    Under GDPR Article 16, you have the right to have inaccurate personal data corrected.
                    Update any of the fields below and save.
                </p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 text-sm text-sky-800">
                To update your profile information, edit the fields below and click <strong>Save Changes</strong>.
                Changes take effect immediately and are version-tracked.
            </div>

            {profileComponent ? (
                <div className="mt-2">
                    {profileComponent}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500">
                        You can update your full profile from the profile page.
                    </p>
                    <Link
                        href={profileSettingsHref}
                        className="inline-flex items-center gap-1.5 text-sky-600 text-sm font-medium hover:underline"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Go to Profile Settings
                    </Link>
                </div>
            )}
        </div>
    )
}
