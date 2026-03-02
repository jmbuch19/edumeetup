import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Exam Proctoring in India — edUmeetup / IAES',
    description:
        'Official exam proctoring centre in Ahmedabad, India for international university students. edUmeetup / IAES is a registered proctor site accepted by international universities.',
    keywords: [
        'exam proctor India', 'exam proctoring Ahmedabad', 'Stanford proctor India',
        'university exam proctor India', 'IAES proctor', 'remote exam India'
    ],
    openGraph: {
        title: 'Exam Proctoring in India — edUmeetup / IAES',
        description: 'Official proctoring centre for international university exams in India.',
        url: 'https://edumeetup.com/proctor',
    }
}

export default function ProctorLayout({ children }: { children: React.ReactNode }) {
    return children
}
