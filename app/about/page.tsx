export default function AboutPage() {
    return (
        <div className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">About edUmeetup</h1>

            <div className="prose prose-lg mx-auto text-gray-600 space-y-6">
                <p>
                    edUmeetup is a platform dedicated to bridging the gap between ambitious students and world-class universities.
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mt-8">Our Mission</h2>
                <p>
                    We believe that every student deserves access to the best education opportunities, regardless of where they are born. Our mission is to simplify the study abroad journey by connecting students directly with university representatives.
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mt-8">For Students</h2>
                <p>
                    Discover programs that match your interests, budget, and career goals. Connect with universities that are actively looking for students like you.
                </p>

                <h2 id="universities" className="text-2xl font-semibold text-gray-900 mt-8 scroll-mt-24">For Universities</h2>
                <p>
                    Reach a diverse pool of qualified students from around the globe. Showcase your programs and find the perfect candidates for your institution.
                </p>

                <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 mt-10">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Us</h3>
                    <p>
                        Have questions? We&apos;d love to hear from you.
                        <br />
                        Email: <a href="mailto:jaydeep@edumeetup.com" className="text-primary hover:underline">jaydeep@edumeetup.com</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
