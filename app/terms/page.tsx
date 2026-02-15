
import Link from 'next/link'

export default function TermsPage() {
    return (
        <div className="bg-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Student User Terms & Conditions
                </h1>
                <p className="text-gray-500 mb-8 italic">
                    Last Updated: February 15, 2026 (Beta Version)
                </p>

                <div className="prose prose-blue max-w-none text-gray-700 space-y-8">

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction & Acceptance</h2>
                        <p>
                            Welcome to <strong>Edumeetup.com</strong> (the “Platform”), a student-focused space for educational meetups, study groups, doubt-solving, project collaboration, and skill-sharing (online/offline).
                        </p>
                        <p>
                            These Student User Terms apply when you register or use the Platform as a Student. By creating an account, clicking “I Agree”, or using any feature, you accept these terms (plus our general Terms of Service and Privacy Policy linked in the footer).
                        </p>
                        <p className="font-semibold text-red-600">
                            If you disagree, please do not use the Platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility & Age Rules (Critical – DPDP Act Compliance)</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You must be a genuine student enrolled in a recognised school, college, university, or educational institution.</li>
                            <li>Minimum age: <strong>13 years</strong>.</li>
                            <li>
                                If you are under 18 years (a “Child” under the <em>Digital Personal Data Protection Act, 2023</em>), you cannot create an account or provide any personal data unless your parent or legal guardian gives verifiable consent on your behalf.
                            </li>
                            <li>During signup, we will require the parent/guardian’s email + explicit consent checkbox.</li>
                            <li>We may use reasonable methods (email OTP, declaration + age-proof upload if needed) to verify the consenting adult is indeed a parent/guardian.</li>
                            <li>You confirm all information provided is true, accurate, and kept updated.</li>
                            <li>We reserve the right to verify student status (e.g., via .edu email, ID upload) and age.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Responsibilities</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>One account per real person only – no fake profiles or impersonation.</li>
                            <li>Keep your password confidential. You are responsible for all activity under your account.</li>
                            <li>Immediately notify us at <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a> if you suspect unauthorised access.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Permitted Use</h2>
                        <p>Use the Platform only for lawful educational purposes:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Creating/joining study groups, meetups, hackathons, project teams.</li>
                            <li>Sharing notes, doubts, resources (with proper credits).</li>
                            <li>Online sessions via integrated tools or offline real-world meetups.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Safety & Offline Meetup Guidelines (Very Important)</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Offline meetups are user-organised – we only provide the connection platform.</li>
                            <li><strong>Always meet in public places</strong> (cafes, libraries, campuses), during daylight hours.</li>
                            <li>Inform a trusted adult/friend about location, time, and people involved.</li>
                            <li>Never share home address, travel alone, or feel pressured.</li>
                            <li>We are not liable for any harm, loss, dispute, or incident during any meetup (online or offline).</li>
                            <li>Report any uncomfortable, suspicious, harassing, or unsafe behaviour immediately to <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a> and authorities (Police / Childline 1098 for under-18).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. User Conduct & Prohibited Activities</h2>
                        <p className="mb-2">You agree to:</p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li>Be respectful – no bullying, harassment, hate speech, discrimination.</li>
                            <li>Not share personal contact info (phone, WhatsApp, social media) prematurely.</li>
                            <li>Not record sessions without everyone’s clear permission.</li>
                            <li>Not post sexual, explicit, violent, or illegal content.</li>
                        </ul>
                        <p className="mb-2 font-bold text-red-600">Strictly Prohibited (immediate ban possible):</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Grooming, sexual solicitation, or POCSO Act violations.</li>
                            <li>Cheating, exam leaks, or academic dishonesty.</li>
                            <li>Spamming, mass invites, commercial ads.</li>
                            <li>Asking/begging for money without verified cause.</li>
                            <li>Fake profiles, bots, or impersonation.</li>
                            <li>Any activity violating Indian laws (including IT Act, POCSO, DPDP Act).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Content & Licence</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You retain ownership of your content (posts, notes, event descriptions).</li>
                            <li>By uploading/posting, you grant us a non-exclusive, royalty-free, worldwide licence to display, host, and promote it on the Platform.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Beta Version – “AS IS” Disclaimer</h2>
                        <p>
                            This is a Beta product – expect bugs, incomplete features, possible data loss, or downtime.
                            No warranties of any kind (express or implied) for availability, accuracy, security, or fitness.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Privacy & Data Protection</h2>
                        <p>
                            We handle your data per our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> (link in footer) and the <em>Digital Personal Data Protection Act, 2023</em>.
                        </p>
                        <p className="mt-2">
                            For users under 18: Parental/guardian consent is mandatory; parents can request access, correction, or erasure via <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination & Suspension</h2>
                        <p>
                            We may suspend/delete your account (without notice/refund) for any violation of these terms, suspicious activity, or legal requirement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
                        <p>
                            To the fullest extent permitted by Indian law, Edumeetup, its founders, and team shall not be liable for any direct, indirect, incidental, consequential damages, including (but not limited to) personal injury, loss during meetups, data loss, or lost opportunities.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law & Jurisdiction</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Governed by laws of India.</li>
                            <li>Exclusive jurisdiction: Courts in Ahmedabad, Gujarat (your location base).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to Terms</h2>
                        <p>
                            We may update these terms. Significant changes will be notified via email or in-app banner. Continued use after changes = acceptance.
                        </p>
                    </section>

                    <div className="border-t pt-8 mt-12 bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Contact Us</h3>
                        <p className="text-gray-600">
                            Email: <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}
