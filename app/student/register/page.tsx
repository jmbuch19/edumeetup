'use client'

import { registerStudent } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { GraduationCap, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { toast } from 'sonner'


interface State {
    error?: string | null | any
    success?: boolean
    email?: string
    message?: string
}

const initialState: State = {
    error: null,
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                </>
            ) : (
                "Create Account"
            )}
        </Button>
    )
}

export default function StudentRegisterPage() {
    const [phone, setPhone] = useState({ code: '+1', number: '' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [state, formAction] = useFormState(registerStudent as any, initialState)
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleSuccess = async (email: string) => {
            try {
                toast.loading("Sending login link...")
                const res = await fetch("/api/auth/send-magic-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, loginType: 'student' }),
                })

                if (!res.ok) throw new Error("Failed to send magic link")

                toast.success("Account created! Check your email to login.")
                // Redirect to verify request page
                window.location.href = `/auth/verify-request?email=${encodeURIComponent(email)}`
            } catch (error) {
                toast.error("Account created, but failed to send link. Please login manually.")
            }
        }

        if (state?.error) {
            // Handle specific field errors or general errors
            const msg = typeof state.error === 'string' ? state.error : "Please check the form for errors."
            toast.error(msg)
        } else if (state?.success && state?.email) {
            handleSuccess(state.email)
        }
    }, [state])

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-3xl space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-primary p-2 rounded-lg mb-4">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Create Student Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Complete your profile to find your perfect university match
                    </p>
                </div>

                <form ref={formRef} className="mt-8 space-y-8" action={formAction}>
                    {/* Section A: Basic Profile */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Section A — Basic Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                {/* Honeypot Field - Hidden */}
                                <input type="text" name="website_url" className="hidden" aria-hidden="true" autoComplete="off" tabIndex={-1} />

                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <Input name="fullName" type="text" required placeholder="John Doe" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <Input name="email" type="email" required placeholder="john@example.com" />
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                <div className="flex gap-4 flex-wrap">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gender" value="Male" required className="accent-primary h-4 w-4" />
                                        <span className="text-sm text-gray-700">Male</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gender" value="Female" required className="accent-primary h-4 w-4" />
                                        <span className="text-sm text-gray-700">Female</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gender" value="Prefer not to say" required className="accent-primary h-4 w-4" />
                                        <span className="text-sm text-gray-700">Prefer not to answer</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group *</label>
                                <select name="ageGroup" required className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Age Group</option>
                                    <option value="Under 20">Under 20</option>
                                    <option value="21-25">21 - 25</option>
                                    <option value="26-30">26 - 30</option>
                                    <option value="31+">31+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country of Residence *</label>
                                <select name="country" required className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Country</option>
                                    <option value="India">India</option>
                                    {/* Detailed ISO List */}
                                    <option value="Afghanistan">Afghanistan</option>
                                    <option value="Albania">Albania</option>
                                    <option value="Algeria">Algeria</option>
                                    <option value="Andorra">Andorra</option>
                                    <option value="Angola">Angola</option>
                                    <option value="Argentina">Argentina</option>
                                    <option value="Armenia">Armenia</option>
                                    <option value="Australia">Australia</option>
                                    <option value="Austria">Austria</option>
                                    <option value="Azerbaijan">Azerbaijan</option>
                                    <option value="Bahamas">Bahamas</option>
                                    <option value="Bahrain">Bahrain</option>
                                    <option value="Bangladesh">Bangladesh</option>
                                    <option value="Barbados">Barbados</option>
                                    <option value="Belarus">Belarus</option>
                                    <option value="Belgium">Belgium</option>
                                    <option value="Belize">Belize</option>
                                    <option value="Benin">Benin</option>
                                    <option value="Bhutan">Bhutan</option>
                                    <option value="Bolivia">Bolivia</option>
                                    <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                                    <option value="Botswana">Botswana</option>
                                    <option value="Brazil">Brazil</option>
                                    <option value="Brunei">Brunei</option>
                                    <option value="Bulgaria">Bulgaria</option>
                                    <option value="Burkina Faso">Burkina Faso</option>
                                    <option value="Burundi">Burundi</option>
                                    <option value="Cambodia">Cambodia</option>
                                    <option value="Cameroon">Cameroon</option>
                                    <option value="Canada">Canada</option>
                                    <option value="Cape Verde">Cape Verde</option>
                                    <option value="Central African Republic">Central African Republic</option>
                                    <option value="Chad">Chad</option>
                                    <option value="Chile">Chile</option>
                                    <option value="China">China</option>
                                    <option value="Colombia">Colombia</option>
                                    <option value="Comoros">Comoros</option>
                                    <option value="Congo">Congo</option>
                                    <option value="Costa Rica">Costa Rica</option>
                                    <option value="Croatia">Croatia</option>
                                    <option value="Cuba">Cuba</option>
                                    <option value="Cyprus">Cyprus</option>
                                    <option value="Czech Republic">Czech Republic</option>
                                    <option value="Denmark">Denmark</option>
                                    <option value="Djibouti">Djibouti</option>
                                    <option value="Dominica">Dominica</option>
                                    <option value="Dominican Republic">Dominican Republic</option>
                                    <option value="East Timor">East Timor</option>
                                    <option value="Ecuador">Ecuador</option>
                                    <option value="Egypt">Egypt</option>
                                    <option value="El Salvador">El Salvador</option>
                                    <option value="Equatorial Guinea">Equatorial Guinea</option>
                                    <option value="Eritrea">Eritrea</option>
                                    <option value="Estonia">Estonia</option>
                                    <option value="Ethiopia">Ethiopia</option>
                                    <option value="Fiji">Fiji</option>
                                    <option value="Finland">Finland</option>
                                    <option value="France">France</option>
                                    <option value="Gabon">Gabon</option>
                                    <option value="Gambia">Gambia</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Germany">Germany</option>
                                    <option value="Ghana">Ghana</option>
                                    <option value="Greece">Greece</option>
                                    <option value="Grenada">Grenada</option>
                                    <option value="Guatemala">Guatemala</option>
                                    <option value="Guinea">Guinea</option>
                                    <option value="Guinea-Bissau">Guinea-Bissau</option>
                                    <option value="Guyana">Guyana</option>
                                    <option value="Haiti">Haiti</option>
                                    <option value="Honduras">Honduras</option>
                                    <option value="Hungary">Hungary</option>
                                    <option value="Iceland">Iceland</option>
                                    <option value="Indonesia">Indonesia</option>
                                    <option value="Iran">Iran</option>
                                    <option value="Iraq">Iraq</option>
                                    <option value="Ireland">Ireland</option>
                                    <option value="Israel">Israel</option>
                                    <option value="Italy">Italy</option>
                                    <option value="Ivory Coast">Ivory Coast</option>
                                    <option value="Jamaica">Jamaica</option>
                                    <option value="Japan">Japan</option>
                                    <option value="Jordan">Jordan</option>
                                    <option value="Kazakhstan">Kazakhstan</option>
                                    <option value="Kenya">Kenya</option>
                                    <option value="Kiribati">Kiribati</option>
                                    <option value="Korea, North">Korea, North</option>
                                    <option value="Korea, South">Korea, South</option>
                                    <option value="Kosovo">Kosovo</option>
                                    <option value="Kuwait">Kuwait</option>
                                    <option value="Kyrgyzstan">Kyrgyzstan</option>
                                    <option value="Laos">Laos</option>
                                    <option value="Latvia">Latvia</option>
                                    <option value="Lebanon">Lebanon</option>
                                    <option value="Lesotho">Lesotho</option>
                                    <option value="Liberia">Liberia</option>
                                    <option value="Libya">Libya</option>
                                    <option value="Liechtenstein">Liechtenstein</option>
                                    <option value="Lithuania">Lithuania</option>
                                    <option value="Luxembourg">Luxembourg</option>
                                    <option value="Macedonia">Macedonia</option>
                                    <option value="Madagascar">Madagascar</option>
                                    <option value="Malawi">Malawi</option>
                                    <option value="Malaysia">Malaysia</option>
                                    <option value="Maldives">Maldives</option>
                                    <option value="Mali">Mali</option>
                                    <option value="Malta">Malta</option>
                                    <option value="Marshall Islands">Marshall Islands</option>
                                    <option value="Mauritania">Mauritania</option>
                                    <option value="Mauritius">Mauritius</option>
                                    <option value="Mexico">Mexico</option>
                                    <option value="Micronesia">Micronesia</option>
                                    <option value="Moldova">Moldova</option>
                                    <option value="Monaco">Monaco</option>
                                    <option value="Mongolia">Mongolia</option>
                                    <option value="Montenegro">Montenegro</option>
                                    <option value="Morocco">Morocco</option>
                                    <option value="Mozambique">Mozambique</option>
                                    <option value="Myanmar">Myanmar</option>
                                    <option value="Namibia">Namibia</option>
                                    <option value="Nauru">Nauru</option>
                                    <option value="Nepal">Nepal</option>
                                    <option value="Netherlands">Netherlands</option>
                                    <option value="New Zealand">New Zealand</option>
                                    <option value="Nicaragua">Nicaragua</option>
                                    <option value="Niger">Niger</option>
                                    <option value="Nigeria">Nigeria</option>
                                    <option value="Norway">Norway</option>
                                    <option value="Oman">Oman</option>
                                    <option value="Pakistan">Pakistan</option>
                                    <option value="Palau">Palau</option>
                                    <option value="Panama">Panama</option>
                                    <option value="Papua New Guinea">Papua New Guinea</option>
                                    <option value="Paraguay">Paraguay</option>
                                    <option value="Peru">Peru</option>
                                    <option value="Philippines">Philippines</option>
                                    <option value="Poland">Poland</option>
                                    <option value="Portugal">Portugal</option>
                                    <option value="Qatar">Qatar</option>
                                    <option value="Romania">Romania</option>
                                    <option value="Russia">Russia</option>
                                    <option value="Rwanda">Rwanda</option>
                                    <option value="St. Kitts and Nevis">St. Kitts and Nevis</option>
                                    <option value="St. Lucia">St. Lucia</option>
                                    <option value="St. Vincent">St. Vincent</option>
                                    <option value="Samoa">Samoa</option>
                                    <option value="San Marino">San Marino</option>
                                    <option value="Sao Tome and Principe">Sao Tome and Principe</option>
                                    <option value="Saudi Arabia">Saudi Arabia</option>
                                    <option value="Senegal">Senegal</option>
                                    <option value="Serbia">Serbia</option>
                                    <option value="Seychelles">Seychelles</option>
                                    <option value="Sierra Leone">Sierra Leone</option>
                                    <option value="Singapore">Singapore</option>
                                    <option value="Slovakia">Slovakia</option>
                                    <option value="Slovenia">Slovenia</option>
                                    <option value="Solomon Islands">Solomon Islands</option>
                                    <option value="Somalia">Somalia</option>
                                    <option value="South Africa">South Africa</option>
                                    <option value="South Sudan">South Sudan</option>
                                    <option value="Spain">Spain</option>
                                    <option value="Sri Lanka">Sri Lanka</option>
                                    <option value="Sudan">Sudan</option>
                                    <option value="Suriname">Suriname</option>
                                    <option value="Swaziland">Swaziland</option>
                                    <option value="Sweden">Sweden</option>
                                    <option value="Switzerland">Switzerland</option>
                                    <option value="Syria">Syria</option>
                                    <option value="Taiwan">Taiwan</option>
                                    <option value="Tajikistan">Tajikistan</option>
                                    <option value="Tanzania">Tanzania</option>
                                    <option value="Thailand">Thailand</option>
                                    <option value="Togo">Togo</option>
                                    <option value="Tonga">Tonga</option>
                                    <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                                    <option value="Tunisia">Tunisia</option>
                                    <option value="Turkey">Turkey</option>
                                    <option value="Turkmenistan">Turkmenistan</option>
                                    <option value="Tuvalu">Tuvalu</option>
                                    <option value="Uganda">Uganda</option>
                                    <option value="Ukraine">Ukraine</option>
                                    <option value="United Arab Emirates">United Arab Emirates</option>
                                    <option value="UK">UK</option>
                                    <option value="USA">USA</option>
                                    <option value="Uruguay">Uruguay</option>
                                    <option value="Uzbekistan">Uzbekistan</option>
                                    <option value="Vanuatu">Vanuatu</option>
                                    <option value="Vatican City">Vatican City</option>
                                    <option value="Venezuela">Venezuela</option>
                                    <option value="Vietnam">Vietnam</option>
                                    <option value="Yemen">Yemen</option>
                                    <option value="Zambia">Zambia</option>
                                    <option value="Zimbabwe">Zimbabwe</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <div className="flex gap-2">
                                    <select
                                        className="h-10 w-24 rounded-md border border-gray-300 bg-background px-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={phone.code}
                                        onChange={(e) => setPhone({ ...phone, code: e.target.value })}
                                    >
                                        <option value="+1">+1 (US/CA)</option>
                                        <option value="+91">+91 (IN)</option>
                                        <option value="+44">+44 (UK)</option>
                                        <option value="+61">+61 (AU)</option>
                                        <option value="+49">+49 (DE)</option>
                                        <option value="+86">+86 (CN)</option>
                                        <option value="+971">+971 (AE)</option>
                                        <option value="">Other</option>
                                    </select>
                                    <Input
                                        value={phone.number}
                                        onChange={(e) => setPhone({ ...phone, number: e.target.value })}
                                        placeholder="234 567 8900"
                                        required
                                    />
                                    <input type="hidden" name="phoneNumber" value={`${phone.code} ${phone.number}`} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Education Level *</label>
                                <select name="currentStatus" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Status</option>
                                    <option value="Grade 12">12th Grade</option>
                                    <option value="Bachelor Final Year">Bachelor’s Final Year</option>
                                    <option value="Bachelor Completed">Bachelor’s Completed</option>
                                    <option value="Master Completed">Master’s Completed</option>
                                    <option value="Working Professional">Working Professional</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section B: Study Preference */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Section B — Study Preference</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Degree Level</label>
                                <select name="preferredDegree" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Degree</option>
                                    <option value="Bachelor's">Bachelor’s</option>
                                    <option value="Master's">Master’s</option>
                                    <option value="MBA">MBA</option>
                                    <option value="PhD">PhD</option>
                                    <option value="Certificate">Certificate</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Interest</label>
                                <select name="fieldOfInterest" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Field</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Business">Business</option>
                                    <option value="Data Science">Data Science</option>
                                    <option value="Health Sciences">Health Sciences</option>
                                    <option value="Social Sciences">Social Sciences</option>
                                    <option value="Arts & Humanities">Arts & Humanities</option>
                                    <option value="Law">Law</option>
                                    <option value="Architecture">Architecture</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range (USD)</label>
                                <select name="budgetRange" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Budget</option>
                                    <option value="< 15,000">&lt; 15,000</option>
                                    <option value="15,000–25,000">15,000–25,000</option>
                                    <option value="25,000–40,000">25,000–40,000</option>
                                    <option value="40,000+">40,000+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Intake</label>
                                <select name="preferredIntake" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Intake</option>
                                    <option value="Fall">Fall</option>
                                    <option value="Spring">Spring</option>
                                    <option value="Summer">Summer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Test Type</label>
                                <select name="englishTestType" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="Not Taken Yet">Not Taken Yet</option>
                                    <option value="IELTS">IELTS</option>
                                    <option value="TOEFL">TOEFL</option>
                                    <option value="Duolingo">Duolingo</option>
                                    <option value="PTE">PTE</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Score (If taken)</label>
                                <Input name="englishScore" type="number" step="0.5" placeholder="e.g. 7.5 or 100" />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Study Country (Optional)</label>
                                <Input name="preferredCountries" placeholder="e.g. USA, Canada, UK" />
                            </div>

                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="block text-sm text-gray-500 mb-4">
                            By creating an account, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
                        </label>
                        {state?.error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4">
                                {state.error}
                            </div>
                        )}
                        <SubmitButton />
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-gray-500">Already have an account? </span>
                    <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                        Sign in
                    </Link>
                </div>
            </div >
        </div >
    )
}
