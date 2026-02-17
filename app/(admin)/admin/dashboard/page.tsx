import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { verifyUniversity } from '@/app/actions'
import { CheckCircle, XCircle, Globe, Mail } from 'lucide-react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// Dashboard is server component
export default async function AdminDashboard() {
    const session = await auth()

    // Note: Layout also checks auth, but double check is fine
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
        redirect('/login')
    }

    // Stats
    const stats = {
        totalStudents: await prisma.studentProfile.count(),
        totalUniversities: await prisma.universityProfile.count(),
        verifiedUniversities: await prisma.universityProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
        pendingUniversities: await prisma.universityProfile.count({ where: { verificationStatus: 'PENDING' } }),
        totalInterests: await prisma.interest.count(),
    }

    const pendingUniversities = await prisma.universityProfile.findMany({
        where: { verificationStatus: 'PENDING' },
        include: { user: true } // to get email
    })

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="bg-gradient-to-r from-primary to-secondary text-white pt-12 pb-24 px-4 rounded-xl mb-8">
                <div className="container mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-blue-100 text-lg opacity-90">Manage university verifications and platform overview.</p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 pb-12">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xs font-medium text-gray-500 uppercase">Total Students</h3>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xs font-medium text-gray-500 uppercase">Total Unis</h3>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalUniversities}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xs font-medium text-gray-500 uppercase">Verified</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.verifiedUniversities}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xs font-medium text-gray-500 uppercase">Pending</h3>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pendingUniversities}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xs font-medium text-gray-500 uppercase">Interests</h3>
                        <p className="text-2xl font-bold text-primary">{stats.totalInterests}</p>
                    </div>
                </div>

                {/* Verification Queue */}
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">Pending Verifications</h2>

                {pendingUniversities.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-gray-200 text-center shadow-sm">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                        <p className="text-gray-500">No pending verification requests.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pendingUniversities.map((uni: any) => (
                                    <tr key={uni.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{uni.institutionName}</div>
                                                    <div className="text-sm text-gray-500">{uni.city}, {uni.country}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{uni.contactEmail}</div>
                                            <div className="text-sm text-gray-500">{uni.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {uni.website && (
                                                <a href={uni.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                                                    <Globe className="h-3 w-3" /> Visit
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <form action={verifyUniversity as any}>
                                                    <input type="hidden" name="universityId" value={uni.id} />
                                                    <input type="hidden" name="action" value="approve" />
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1">
                                                        <CheckCircle className="h-4 w-4" /> Approve
                                                    </Button>
                                                </form>
                                                <form action={verifyUniversity as any}>
                                                    <input type="hidden" name="universityId" value={uni.id} />
                                                    <input type="hidden" name="action" value="reject" />
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1">
                                                        <XCircle className="h-4 w-4" /> Reject
                                                    </Button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
