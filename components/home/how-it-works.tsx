'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './how-it-works.module.css'
import { cn } from '@/lib/utils'
import { InteractiveCard } from '@/components/ui/interactive-card'

interface HowItWorksProps {
    activeTab?: 'student' | 'university'
    onTabChange?: (tab: 'student' | 'university') => void
}

export function HowItWorks({ activeTab: propActiveTab, onTabChange }: HowItWorksProps) {
    const [localActiveTab, setLocalActiveTab] = useState<'student' | 'university'>('student')
    const activeTab = propActiveTab || localActiveTab

    // State for interactive cards
    const [activeStudentStep, setActiveStudentStep] = useState<number | null>(null)
    const [activeUniStep, setActiveUniStep] = useState<number | null>(null)
    const [activeValueProp, setActiveValueProp] = useState<number | null>(null)

    const handleTabChange = (tab: 'student' | 'university') => {
        if (onTabChange) {
            onTabChange(tab)
        } else {
            setLocalActiveTab(tab)
        }
    }

    const studentSteps = [
        {
            number: '01',
            icon: '✏️',
            title: 'Build Your Profile',
            desc: 'Tell us your academic background, target countries, and dream programs. Takes 5 minutes. The more complete your profile, the better your matches.'
        },
        {
            number: '02',
            icon: '🔍',
            title: 'Browse Verified Unis',
            desc: 'Every university on edUmeetup is admin-verified. Filter by country, program, intake date, tuition, or scholarship availability. No fake listings.'
        },
        {
            number: '03',
            icon: '💬',
            title: 'Express Interest',
            desc: 'See a university you like? Hit one button. They get your profile summary instantly. No long application form, no fees, no middlemen.'
        },
        {
            number: '04',
            icon: '📅',
            title: 'Meet Directly',
            desc: 'When a university accepts your interest, you book a direct video call with their admissions team. Real people. Real answers. Your questions, their program.'
        }
    ]

    const uniSteps = [
        {
            number: '01',
            icon: '📋',
            title: 'Apply & Get Verified',
            desc: 'Submit your institution details and accreditation documents. Our team verifies every listing — so students trust your profile from day one.'
        },
        {
            number: '02',
            icon: '📚',
            title: 'List Your Programs',
            desc: 'Add all your programs with intake dates, tuition, entry requirements, and scholarships. Bulk CSV import available. Students filter directly to your offerings.'
        },
        {
            number: '03',
            icon: '👤',
            title: 'Review Student Profiles',
            desc: 'See full academic background, test scores, budget, and goals before responding. Accept the students that fit. Decline the ones that don\'t — no obligation.'
        },
        {
            number: '04',
            icon: '🤝',
            title: 'Convert Directly',
            desc: 'Schedule a meeting, answer questions, send your application link. The entire pipeline — from interest to enrolment — managed in your dashboard.'
        }
    ]

    const uniValueProps = [
        {
            icon: '🎯',
            label: 'Qualified Leads',
            title: 'Students who come to you already know your programs',
            desc: 'Every student who expresses interest has already read your program details, tuition, and requirements. No cold enquiries. No time wasted on unfit candidates.'
        },
        {
            icon: '📊',
            label: 'Direct Pipeline',
            title: 'Your own CRM dashboard — not a shared inbox',
            desc: 'Manage every student interaction in one place. See their academic profile before accepting. Add notes. Track from first contact to enrolment. Export anytime.'
        },
        {
            icon: '🌍',
            label: 'Global Reach',
            title: 'Reach students you\'d never find through agents',
            desc: 'Students from 80+ countries actively browse edUmeetup. Your verified profile and program listings are discoverable globally — 24/7, without additional effort.'
        }
    ]

    return (
        <section className={styles.howItWorks} id="how-it-works">
            {/* Load Fonts needed for this component specifically */}
            <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>

            <div className={styles.sectionInner}>

                <span className={styles.sectionLabel}>How it works</span>

                <h2 className={styles.sectionHeadline}>
                    Built for both sides<br />of the <em>conversation</em>
                </h2>

                {/* TAB SWITCHER */}
                <div className={styles.tabSwitcher} role="tablist" aria-label="View how edUmeetup works">
                    <button
                        className={cn(styles.tabBtn, activeTab === 'student' && styles.active)}
                        id="tab-student"
                        role="tab"
                        aria-selected={activeTab === 'student'}
                        aria-controls="panel-student"
                        onClick={() => handleTabChange('student')}
                    >
                        <span className={styles.tabIcon}>🎓</span>
                        <span className={styles.tabLabel}>I&apos;m a Student</span>
                    </button>
                    <button
                        className={cn(styles.tabBtn, activeTab === 'university' && styles.active)}
                        id="tab-university"
                        role="tab"
                        aria-selected={activeTab === 'university'}
                        aria-controls="panel-university"
                        onClick={() => handleTabChange('university')}
                    >
                        <span className={styles.tabIcon}>🏛️</span>
                        <span className={styles.tabLabel}>I&apos;m a University</span>
                    </button>
                </div>


                {/* ──────────────────────────────────────────────────────── */}
                {/* STUDENT PANEL                                           */}
                {/* ──────────────────────────────────────────────────────── */}
                <div
                    className={cn(styles.tabPanel, styles.panelStudent, activeTab === 'student' && styles.active)}
                    id="panel-student"
                    role="tabpanel"
                    aria-labelledby="tab-student"
                >

                    {/* Stats bar — social proof for students */}
                    <div className={styles.statBar}>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>Verified</div>
                            <div className={styles.statLabel}>Admin-verified<br />institutions</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>Free</div>
                            <div className={styles.statLabel}>No agent fees<br />for students</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>Direct</div>
                            <div className={styles.statLabel}>Direct connection<br />(No middlemen)</div>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className={styles.stepsGrid}>
                        {studentSteps.map((step, idx) => (
                            <InteractiveCard
                                key={idx}
                                isActive={activeStudentStep === idx}
                                onActive={() => setActiveStudentStep(idx)}
                                onInactive={() => setActiveStudentStep(null)}
                                className={cn(styles.stepCard, "bg-white/80 backdrop-blur-sm transition-all")}
                                activeClassName={cn(styles.stepCard, "bg-white border-blue-600 shadow-xl scale-[1.02]")}
                            >
                                <div className={styles.stepNumber}>{step.number}</div>
                                <span className={styles.stepIcon}>{step.icon}</span>
                                <h3 className={styles.stepTitle}>{step.title}</h3>
                                <p className={styles.stepDesc}>{step.desc}</p>
                            </InteractiveCard>
                        ))}
                    </div>

                    {/* Student CTA */}
                    <div className={styles.ctaBlock}>
                        <div className={styles.ctaText}>
                            <h3>Ready to find your university?</h3>
                            <p>Create your free profile in under 5 minutes. No credit card, no agents, no fees — ever.</p>
                        </div>
                        <div className={styles.ctaActions}>
                            <Link href="/student/register" className={styles.btnPrimary}>Create Free Profile →</Link>
                            <Link href="/universities" className={styles.btnGhost}>Browse Universities</Link>
                        </div>
                    </div>
                </div>


                {/* ──────────────────────────────────────────────────────── */}
                {/* UNIVERSITY PANEL                                        */}
                {/* ──────────────────────────────────────────────────────── */}
                <div
                    className={cn(styles.tabPanel, styles.panelUniversity, activeTab === 'university' && styles.active)}
                    id="panel-university"
                    role="tabpanel"
                    aria-labelledby="tab-university"
                >

                    {/* ROI Strip — lead with cost/benefit headline */}
                    <div className={styles.roiStrip}>
                        <span className={styles.roiIcon}>💡</span>
                        <p>Traditional recruitment agents charge <strong>15–25% commission per enrolled student</strong>. edUmeetup gives you a direct pipeline to qualified, self-selecting students — at a fraction of the cost.</p>
                    </div>

                    {/* Value props — 3 core university benefits */}
                    <div className={styles.valueProps}>
                        {uniValueProps.map((prop, idx) => (
                            <InteractiveCard
                                key={idx}
                                isActive={activeValueProp === idx}
                                onActive={() => setActiveValueProp(idx)}
                                onInactive={() => setActiveValueProp(null)}
                                className={cn(styles.valueProp, "min-h-[280px]")}
                                activeClassName={cn(styles.valueProp, "bg-white border-blue-600 shadow-xl min-h-[280px]")}
                            >
                                <span className={styles.valuePropIcon}>{prop.icon}</span>
                                <div className={styles.valuePropLabel}>{prop.label}</div>
                                <h3 className={styles.valuePropTitle}>{prop.title}</h3>
                                <p className={styles.valuePropDesc}>{prop.desc}</p>
                            </InteractiveCard>
                        ))}
                    </div>

                    {/* Steps */}
                    <div className={styles.stepsGrid} style={{ marginBottom: '32px' }}>
                        {uniSteps.map((step, idx) => (
                            <InteractiveCard
                                key={idx}
                                isActive={activeUniStep === idx}
                                onActive={() => setActiveUniStep(idx)}
                                onInactive={() => setActiveUniStep(null)}
                                className={styles.stepCard}
                                activeClassName={cn(styles.stepCard, "bg-white border-blue-600 shadow-xl")}
                            >
                                <div className={styles.stepNumber}>{step.number}</div>
                                <span className={styles.stepIcon}>{step.icon}</span>
                                <h3 className={styles.stepTitle}>{step.title}</h3>
                                <p className={styles.stepDesc}>{step.desc}</p>
                            </InteractiveCard>
                        ))}
                    </div>

                    {/* Old way vs edUmeetup comparison */}
                    <div className={styles.comparisonRow}>
                        <div className={cn(styles.comparisonCol, styles.colOld)}>
                            <div className={styles.comparisonLabel}>The old way</div>
                            <h4>Agents, fairs & cold outreach</h4>
                            <ul className={styles.comparisonList}>
                                <li>15–25% agent commission per student</li>
                                <li>Leads shared with 10+ competitor universities</li>
                                <li>No visibility into student quality upfront</li>
                                <li>Agents own the student relationship</li>
                                <li>No data or pipeline tracking</li>
                            </ul>
                        </div>

                        <div className={styles.comparisonDivider}>
                            <div className={styles.vsLine}></div>
                            <div className={styles.vsBadge}>VS</div>
                            <div className={styles.vsLine}></div>
                        </div>

                        <div className={cn(styles.comparisonCol, styles.colNew)}>
                            <div className={styles.comparisonLabel}>With edUmeetup</div>
                            <h4>Direct. Qualified. Yours.</h4>
                            <ul className={styles.comparisonList}>
                                <li>Flat platform fee — no per-student commission</li>
                                <li>Students chose you specifically, not a shortlist</li>
                                <li>Full academic profile before you accept</li>
                                <li>You own the student relationship directly</li>
                                <li>Full pipeline dashboard from interest to enrolment</li>
                            </ul>
                        </div>
                    </div>

                    {/* University CTA */}
                    <div className={styles.ctaBlock}>
                        <div className={styles.ctaText}>
                            <h3>Start building your direct pipeline</h3>
                            <p>Apply for verification today. Our team reviews within 48 hours. Then go live and start receiving student interest.</p>
                        </div>
                        <div className={styles.ctaActions}>
                            <Link href="#how-it-works" className={styles.btnGhost}>See How Verification Works</Link>
                            <Link href="/university/register" className={styles.btnPrimary}>Start Your Application →</Link>
                        </div>
                    </div>

                </div>
                {/* end university panel */}

            </div>
        </section>
    )
}
