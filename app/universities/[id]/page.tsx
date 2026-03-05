import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import {
  MapPin, Globe, GraduationCap, BookOpen, Clock,
  DollarSign, Users, Lock, Phone, Mail, Calendar
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UniversityLogo } from '@/components/university/university-logo'
import Link from 'next/link'
import { expressInterest } from '@/app/actions'
import ExpressInterestButton from '@/components/university/express-interest-button'

export const dynamic = 'force-dynamic'

export default async function UniversityDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // ── Auth check (optional — used to decide what to show) ───────────────────
  const session = await auth()
  const isLoggedIn = !!session?.user

  // ── Security gate — VERIFIED + isPublic only ──────────────────────────────
  const uni = await prisma.university.findFirst({
    where: {
      id,
      verificationStatus: 'VERIFIED',
      isPublic: true,
    },
    include: {
      programs: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      },
      documents: {
        select: {
          id: true,
          displayName: true,
          category: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
        },
        orderBy: { uploadedAt: 'desc' },
      },
      events: {
        where: { isPublished: true, status: 'UPCOMING' },
        orderBy: { dateTime: 'asc' },
        take: 3,
      },
      _count: {
        select: { interests: true, meetings: true }
      }
    },
  })

  // 404 if not found, not verified, or not public
  if (!uni) notFound()

  // Check if this student has already expressed interest
  let alreadyExpressed = false
  if (session?.user?.role === 'STUDENT') {
    const existing = await prisma.interest.findFirst({
      where: {
        universityId: id,
        student: { user: { email: session.user.email ?? '' } },
      },
      select: { id: true },
    })
    alreadyExpressed = !!existing
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-start gap-5">
            <UniversityLogo
              src={uni.logo}
              alt={uni.institutionName}
              size="lg"
              isVerified
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {uni.institutionName}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {[uni.city, uni.country].filter(Boolean).join(', ')}
                    </span>
                    {uni.website && (
                      <a href={uni.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline">
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                    {uni.foundedYear && (
                      <span className="text-sm text-slate-400">Est. {uni.foundedYear}</span>
                    )}
                  </div>
                </div>

                {/* CTA — Book Meeting gated for guests */}
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {uni.meetingLink && (
                    isLoggedIn ? (
                      <a href={uni.meetingLink} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          Book a Meeting
                        </Button>
                      </a>
                    ) : (
                      <Link href="/login">
                        <Button variant="outline" className="gap-2">
                          <Lock className="h-4 w-4 text-slate-400" />
                          Book a Meeting
                        </Button>
                      </Link>
                    )
                  )}
                  {session?.user?.role === 'STUDENT' ? (
                    <ExpressInterestButton
                      universityId={uni.id}
                      alreadyExpressed={alreadyExpressed}
                    />
                  ) : !isLoggedIn ? (
                    <Link href="/login">
                      <Button className="gap-2">
                        <Mail className="h-4 w-4" />
                        Connect with Us
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 mt-4 flex-wrap">
                {uni.totalStudents && (
                  <StatPill icon={Users} value={uni.totalStudents.toLocaleString()} label="Students" />
                )}
                {uni.internationalStudents && (
                  <StatPill icon={Globe} value={uni.internationalStudents.toLocaleString()} label="International" />
                )}
                <StatPill icon={BookOpen} value={String(uni.programs.length)} label="Programmes" />
                {uni.scholarshipsAvailable && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    ✓ Scholarships available
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* About */}
          {uni.about && (
            <p className="mt-5 text-slate-600 leading-relaxed max-w-3xl text-sm">
              {uni.about}
            </p>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Rep Contact — GATED for guests ───────────────────────────── */}
        {(uni.repName || uni.repEmail || uni.contactPhone || uni.contactEmail) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">University Representative</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoggedIn ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {uni.repName && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Name</p>
                      <p className="text-sm font-medium text-slate-800">{uni.repName}</p>
                      {uni.repDesignation && (
                        <p className="text-xs text-slate-500">{uni.repDesignation}</p>
                      )}
                    </div>
                  )}
                  {uni.repEmail && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Email</p>
                      <a href={`mailto:${uni.repEmail}`}
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />{uni.repEmail}
                      </a>
                    </div>
                  )}
                  {uni.contactPhone && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                      <a href={`tel:${uni.contactPhone}`}
                        className="text-sm font-medium text-slate-800 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />{uni.contactPhone}
                      </a>
                    </div>
                  )}
                  {uni.contactEmail && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">General Contact</p>
                      <a href={`mailto:${uni.contactEmail}`}
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />{uni.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* ── SOFT GATE — inline blurred placeholder ────────────── */
                <div className="relative">
                  <div className="grid sm:grid-cols-2 gap-4 select-none pointer-events-none"
                    style={{ filter: 'blur(5px)', opacity: 0.4 }}>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Name</p>
                      <p className="text-sm font-medium text-slate-800">Dr. Sarah Johnson</p>
                      <p className="text-xs text-slate-500">Director of Admissions</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-primary">admissions@university.edu</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                      <p className="text-sm text-slate-800">+1 XXX XXX XXXX</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link href="/login">
                      <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-md rounded-xl px-5 py-3 cursor-pointer hover:shadow-lg transition-shadow">
                        <Lock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-slate-800">
                          Sign in to view contact details
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Programmes — fully visible ────────────────────────────────── */}
        {uni.programs.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Programmes ({uni.programs.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {uni.programs.map(program => (
                <Card key={program.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                        {program.programName}
                      </h3>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {program.degreeLevel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {program.fieldCategory}
                        </Badge>
                        {program.stemDesignated && (
                          <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            STEM
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      {program.durationMonths && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {program.durationMonths} months
                        </span>
                      )}
                      {program.tuitionFee && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {program.tuitionFee.toLocaleString()} {program.currency ?? 'USD'}/yr
                        </span>
                      )}
                      {program.intakes.length > 0 && (
                        <span className="flex items-center gap-1 col-span-2">
                          <Calendar className="h-3 w-3" />
                          Intakes: {program.intakes.join(', ')}
                        </span>
                      )}
                    </div>
                    {program.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {program.description}
                      </p>
                    )}
                    {/* Express Interest per-programme — logged-in only */}
                    {isLoggedIn && (
                      <div className="pt-3 border-t border-slate-100">
                        <form action={async () => {
                          'use server'
                          await expressInterest(id, undefined, program.id)
                        }}>
                          <Button size="sm" variant="outline" className="w-full">
                            Express Interest in Programme
                          </Button>
                        </form>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Documents — names visible, download gated ─────────────────── */}
        {uni.documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brochures &amp; Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uni.documents.map(doc => (
                  <div key={doc.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{doc.displayName}</p>
                        <p className="text-xs text-slate-400">{doc.category}</p>
                      </div>
                    </div>
                    {isLoggedIn ? (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-primary hover:underline shrink-0">
                        Download
                      </a>
                    ) : (
                      <Link href="/login"
                        className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-primary transition-colors shrink-0">
                        <Lock className="h-3 w-3" />
                        Sign in to download
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Events — fully visible ────────────────────────────────────── */}
        {uni.events.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {uni.events.map(event => (
                <div key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(event.dateTime).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })} · {event.location}
                    </p>
                    {event.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Bottom CTA for guests ─────────────────────────────────────── */}
        {!isLoggedIn && (
          <div className="rounded-2xl border border-primary/20 p-8 text-center"
            style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8eeff)' }}>
            <GraduationCap className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Interested in {uni.institutionName}?
            </h3>
            <p className="text-sm text-slate-600 mb-5 max-w-md mx-auto">
              Create a free account to express interest, book a meeting with their admissions team,
              and get matched with programmes that fit your profile.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/student/register">
                <Button size="lg">Create Free Account</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label }: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <strong>{value}</strong>
      <span className="text-slate-400">{label}</span>
    </div>
  )
}
