import Link from "next/link"
import { GraduationCap, Mail, Github } from "lucide-react"

export function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 pt-12 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="bg-primary p-1.5 rounded-lg">
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-lg text-primary">edUmeetup</span>
                        </Link>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Connecting students with universities worldwide. Where dreams meet destinations.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/universities" className="hover:text-primary">Browse Universities</Link></li>
                            <li><Link href="/student/register" className="hover:text-primary">For Students</Link></li>
                            <li><Link href="/university/register" className="hover:text-primary">For Universities</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                            <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>jaydeep@edumeetup.com</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Github className="h-4 w-4" />
                                <span>@jaydeep</span>
                            </li>
                            <li className="flex items-center gap-2">
                                {/* Using a simple text X for now as lucide might not have the new logo yet, or use Twitter icon */}
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                <Link href="https://x.com/edUMeetup0226" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                    @edUMeetup0226
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        &copy; {new Date().getFullYear()} edUmeetup. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
