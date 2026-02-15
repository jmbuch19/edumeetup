
export default function PrivacyPage() {
    return (
        <div className="bg-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Privacy Policy
                </h1>
                <p className="text-gray-500 mb-8 italic">
                    Last Updated: February 15, 2026 (Beta Version)
                </p>

                <div className="prose prose-blue max-w-none text-gray-700 space-y-8">

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                        <p>
                            <strong>Edumeetup.com</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is operated by [Your Company Name / Your Name], based in Ahmedabad, Gujarat, India.
                        </p>
                        <p>
                            We are committed to protecting your privacy and handling your digital personal data (as defined under the <em>Digital Personal Data Protection Act, 2023</em> – &quot;DPDP Act&quot;) in a fair, lawful, and transparent manner.
                        </p>
                        <p className="mt-2">This Privacy Policy explains:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>What personal data we collect from you (as a student user, parent/guardian, or visitor).</li>
                            <li>How we use, share, store, and protect it.</li>
                            <li>Your rights as a Data Principal under the DPDP Act.</li>
                            <li>How to contact us.</li>
                        </ul>
                        <p className="mt-4">
                            By using the Platform (including registering, creating/joining meetups, or submitting any data), you agree to this Policy. If you are under 18, your parent/legal guardian must consent on your behalf.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Scope & Applicability</h2>
                        <p>
                            This Policy applies to all digital personal data we process in connection with the Platform, including data collected in India or relating to offering services to individuals in India (as per DPDP Act).
                        </p>
                        <p>
                            It does not apply to non-personal data or anonymized/aggregated data that cannot identify you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Personal Data We Collect</h2>
                        <p>We collect only data necessary for providing educational meetup services. Categories include:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong>Account & Profile Data:</strong> Name, email, phone (optional), age/date of birth, educational institution details, student ID/email domain (for verification).</li>
                            <li><strong>Parental/Guardian Data (for users under 18):</strong> Parent/guardian name, email, consent declaration.</li>
                            <li><strong>Usage & Interaction Data:</strong> Meetup creation/joins, messages/chats (if enabled), posts/notes shared, IP address, device info, browser type, timestamps.</li>
                            <li><strong>Optional/Voluntary Data:</strong> Profile photo, bio, shared files/notes, event feedback.</li>
                        </ul>
                        <p className="mt-4 font-semibold">
                            We do not collect sensitive financial data (unless future paid features), health data, or biometric data at this beta stage.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Collect Your Data</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Directly from you during signup, profile update, meetup creation/join.</li>
                            <li>Automatically via cookies, logs, analytics tools (e.g., basic Google Analytics – no targeted ads).</li>
                            <li>From parents/guardians for verifiable consent (under-18 users).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Purposes of Processing (Why We Use Your Data)</h2>
                        <p>We process your data for these specified purposes only:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>To create and manage your account.</li>
                            <li>To verify student status and age/eligibility.</li>
                            <li>To enable creating/joining educational meetups, study groups, sharing resources.</li>
                            <li>To provide Platform features (notifications, messaging if implemented).</li>
                            <li>To ensure safety, prevent abuse, comply with laws (e.g., report suspicious activity).</li>
                            <li>To improve the Platform (analytics, bug fixes – aggregated/anonymized).</li>
                            <li>For communication (e.g., updates, safety alerts).</li>
                        </ul>
                        <p className="mt-4 font-bold text-red-600">
                            We do not use your data for behavioral monitoring, targeted advertising to children, or any purpose not listed here.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Consent & Notice (DPDP Act Compliance)</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>We obtain your (or your parent/guardian&apos;s) free, specific, informed, unconditional, and unambiguous consent via affirmative action (checkbox during signup).</li>
                            <li><strong>For users under 18:</strong> Verifiable parental/guardian consent is mandatory before any data processing (email verification + consent checkbox).</li>
                            <li>Consent can be withdrawn anytime by emailing <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a> (withdrawal may limit access to features).</li>
                            <li>We provide this notice before/during consent collection.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Sharing & Disclosure of Data</h2>
                        <p>We share data only when necessary:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>With data processors (e.g., cloud hosting like AWS/GCP, email service providers) under strict contracts.</li>
                            <li>To comply with law, court orders, or protect safety/rights.</li>
                            <li>In case of merger/acquisition (with notice where possible).</li>
                        </ul>
                        <p className="mt-4 font-bold">
                            We do not sell your personal data. No sharing for marketing by third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
                        <p>We retain your data only as long as needed for the purposes above or legal requirements:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong>Active accounts:</strong> As long as account exists + reasonable period after deletion request.</li>
                            <li><strong>Inactive accounts:</strong> Up to 3 years (or as per DPDP Rules).</li>
                            <li><strong>Logs/analytics:</strong> Shorter periods (e.g., 6–12 months).</li>
                        </ul>
                        <p className="mt-2">After that, we delete or anonymize data.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Your Rights as Data Principal (Under DPDP Act)</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Access your personal data we hold.</li>
                            <li>Correct/update inaccurate data.</li>
                            <li>Erase (right to be forgotten) – subject to legal exceptions.</li>
                            <li>Nominate someone to exercise rights after you.</li>
                            <li>Withdraw consent.</li>
                            <li>Grievance redressal (see below).</li>
                        </ul>
                        <p className="mt-4">
                            To exercise any right: Email <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a> with proof of identity. We will respond within timelines prescribed under DPDP Rules (usually 30 days or as notified).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Grievance Redressal</h2>
                        <p>For any privacy complaint/query:</p>
                        <p className="font-semibold">Contact: <a href="mailto:info@edumeetup.com" className="text-primary underline">info@edumeetup.com</a></p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>We will acknowledge within 7 working days (as per DPDP Rules) and resolve as per law.</li>
                            <li>If unsatisfied, you may approach the Data Protection Board of India.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Data Security</h2>
                        <p>
                            We implement reasonable security safeguards (encryption in transit/rest, access controls, regular reviews) to protect against unauthorized access, loss, or breach.
                            In case of a data breach likely to cause harm, we will notify the Data Protection Board and affected users as required by DPDP Rules.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">12. International Transfers</h2>
                        <p>
                            Data may be stored/processed on cloud servers outside India (e.g., US/EU providers compliant with contracts). We ensure appropriate safeguards for cross-border transfers as per DPDP Act/Rules.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Children&apos;s Data (Special Protection)</h2>
                        <p>For users under 18:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Verifiable parental/guardian consent mandatory.</li>
                            <li>No behavioral tracking or targeted ads.</li>
                            <li>Parents can access/correct/erase child&apos;s data via request.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to This Policy</h2>
                        <p>
                            We may update this Policy. Significant changes will be notified via email or Platform banner. Continued use after changes = acceptance.
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
