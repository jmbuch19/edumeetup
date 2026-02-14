import React from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { verifyUniversity } from '@/app/actions'
import { CheckCircle, XCircle, Globe, Mail } from 'lucide-react'

export default async function AdminDashboard() {
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
        include: {
            user: true,
            programs: true
        }
    })

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-medium text-gray-500 uppercase">Total Students</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-medium text-gray-500 uppercase">Total Unis</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUniversities}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-medium text-gray-500 uppercase">Verified</h3>
                    <p className="text-2xl font-bold text-green-600">{stats.verifiedUniversities}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-medium text-gray-500 uppercase">Pending</h3>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingUniversities}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-medium text-gray-500 uppercase">Interests</h3>
                    <p className="text-2xl font-bold text-primary">{stats.totalInterests}</p>
                </div>
            </div>

            {/* Verification Queue */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Verifications</h2>

            {pendingUniversities.length === 0 ? (
                <div className="bg-gray-50 p-12 rounded-xl border border-gray-200 text-center text-gray-500">
                    No pending verifications. Good job!
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
                            {pendingUniversities.map((uni) => (
                                <tr key={uni.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{uni.institutionName}</div>
                                                <div className="text-sm text-gray-500">{uni.city}, {uni.country}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{uni.repName || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">{uni.repDesignation}</div>
                                        <div className="text-xs text-gray-400">{uni.user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{uni.programs.length} Programs</div>
                                        {uni.website && (
                                            <a href={uni.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                                                <Globe className="h-3 w-3" /> Visit Website
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <form action={verifyUniversity}>
                                                <input type="hidden" name="universityId" value={uni.id} />
                                                <input type="hidden" name="action" value="approve" />
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                                </Button>
                                            </form>
                                            <form action={verifyUniversity}>
                                                <input type="hidden" name="universityId" value={uni.id} />
                                                <input type="hidden" name="action" value="reject" />
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                                                    <XCircle className="h-4 w-4 mr-1" /> Reject
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
    )
}
