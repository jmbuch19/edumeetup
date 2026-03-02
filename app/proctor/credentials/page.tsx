/**
 * /proctor/credentials
 * Print-ready IAES credentials page — opens in new tab, auto-triggers print dialog.
 * Students / universities can save as PDF via browser print → Save as PDF.
 */
export default function ProctorCredentialsPage() {
    return (
        <>
            {/* Auto-print on load */}
            <script dangerouslySetInnerHTML={{ __html: 'window.onload=()=>window.print()' }} />

            <style>{`
        @page { size: A4; margin: 24mm 20mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; }
      `}</style>

            <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px' }}>

                {/* Header */}
                <div style={{ borderBottom: '3px solid #3333CC', paddingBottom: 20, marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', background: 'linear-gradient(135deg,#3333CC,#1e3a5f)',
                            fontSize: 24, color: '#fff', flexShrink: 0
                        }}>🛡</div>
                        <div>
                            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                Indo American Education Society (IAES)
                            </h1>
                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Registered Society under the Societies Registration Act, India
                            </p>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: 28 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#3333CC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Official Proctor Site — Credential Letter
                    </h2>
                    <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                        This document certifies that <strong>edUmeetup / IAES</strong> is a registered examination
                        proctoring centre in India, authorised to invigilate examinations for students of international
                        universities on behalf of their institutions.
                    </p>
                </div>

                {/* Details grid */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
                    <tbody>
                        {[
                            { label: 'Organisation', value: 'Indo American Education Society (IAES)' },
                            { label: 'Platform', value: 'edUmeetup — edumeetup.com' },
                            { label: 'Proctor Site Address', value: 'Ahmedabad, Gujarat, India' },
                            { label: 'Proctoring Email', value: 'proctor@edumeetup.com' },
                            { label: 'Phone', value: '+91 79 XXXX XXXX' },
                            { label: 'Website', value: 'www.edumeetup.com' },
                            { label: 'Status', value: 'Active Proctor Partner' },
                        ].map(({ label, value }) => (
                            <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px 10px 0', width: '38%', fontSize: 12, fontWeight: 600, color: '#64748b', verticalAlign: 'top' }}>
                                    {label}
                                </td>
                                <td style={{ padding: '10px 0', fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                                    {value}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Capabilities */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 28 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                        Proctoring Capabilities
                    </h3>
                    {[
                        'CCTV-monitored, secure examination hall',
                        'Identity verification per university requirements',
                        'Support for both online-proctored and paper-based exams',
                        'Flexible capacity — individual students to cohorts of 50+',
                        'Available on weekdays and weekends',
                        'Dedicated coordinator for each booking',
                    ].map(c => (
                        <div key={c} style={{ fontSize: 12, color: '#475569', padding: '4px 0' }}>✓ &nbsp;{c}</div>
                    ))}
                </div>

                {/* Note for university */}
                <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '14px 18px', marginBottom: 28 }}>
                    <p style={{ fontSize: 12, color: '#3730a3', lineHeight: 1.6 }}>
                        <strong>To university examination offices:</strong> To register IAES / edUmeetup as a proctor site
                        for your students in India, please contact us at{' '}
                        <strong>proctor@edumeetup.com</strong> or visit{' '}
                        <strong>edumeetup.com/proctor</strong> to submit a partnership enquiry.
                    </p>
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>Generated from edumeetup.com/proctor</p>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: '#3333CC', fontWeight: 700 }}>edUmeetup / IAES</p>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>proctor@edumeetup.com</p>
                    </div>
                </div>

            </div>

            {/* Print button — only visible on screen, hidden when printing */}
            <div className="no-print" style={{ textAlign: 'center', marginTop: 32, marginBottom: 40, fontFamily: 'sans-serif' }}>
                <button
                    onClick={() => window.print()}
                    style={{
                        background: 'linear-gradient(135deg,#3333CC,#1e3a5f)', color: '#fff',
                        border: 'none', borderRadius: 10, padding: '12px 32px',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer'
                    }}>
                    ⬇ Save as PDF / Print
                </button>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                    File → Print → Save as PDF
                </p>
            </div>
        </>
    )
}
