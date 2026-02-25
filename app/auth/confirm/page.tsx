'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmContent() {
    const params = useSearchParams()
    const url = params.get('url')

    if (!url || !url.includes('/api/auth/callback/email')) {
        return (
            <div style={styles.card}>
                <div style={styles.icon}>⚠️</div>
                <h1 style={styles.title}>Invalid Link</h1>
                <p style={styles.text}>This sign-in link is invalid or malformed.</p>
                <a href="/login" style={styles.btn}>Back to Login</a>
            </div>
        )
    }

    return (
        <div style={styles.card}>
            <div style={styles.logo}>
                edU<span style={{ color: '#3333CC' }}>meetup</span>
            </div>
            <div style={styles.icon}>✉️</div>
            <h1 style={styles.title}>Confirm Sign In</h1>
            <p style={styles.text}>
                Click the button below to complete your sign-in. This link is single-use and expires in 15 minutes.
            </p>
            <button onClick={() => { window.location.href = url! }} style={styles.btn}>
                Sign In to edUmeetup →
            </button>
            <p style={styles.warning}>
                If you did not request this, you can safely ignore this page.
            </p>
        </div>
    )
}

export default function ConfirmPage() {
    return (
        <div style={styles.page}>
            <Suspense fallback={
                <div style={styles.card}>
                    <p style={styles.text}>Loading…</p>
                </div>
            }>
                <ConfirmContent />
            </Suspense>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '2rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
    },
    logo: {
        fontSize: '22px',
        fontWeight: 800,
        marginBottom: '1.5rem',
        color: '#0f172a',
        letterSpacing: '-0.5px',
    },
    icon: {
        fontSize: '2.5rem',
        marginBottom: '1rem',
    },
    title: {
        fontSize: '1.4rem',
        fontWeight: 700,
        color: '#0f172a',
        margin: '0 0 0.75rem',
    },
    text: {
        fontSize: '0.9rem',
        color: '#64748b',
        marginBottom: '1.5rem',
        lineHeight: 1.6,
    },
    btn: {
        display: 'inline-block',
        background: '#3333CC',
        color: 'white',
        padding: '12px 28px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.95rem',
        textDecoration: 'none',
        marginBottom: '1.25rem',
    },
    warning: {
        fontSize: '0.75rem',
        color: '#94a3b8',
        margin: 0,
    },
}
