import React, { useState } from 'react';
import { getIssuerInfo } from '../lib/contract';
import { getExplorerUrl, APP_ID } from '../lib/algorand';
import toast from 'react-hot-toast';

const FAQ_ITEMS = [
    {
        step: '1',
        title: 'Get the App ID',
        desc: 'Ask the institution for their CredVerify contract App ID. This is public on Algorand TestNet/MainNet.',
    },
    {
        step: '2',
        title: 'Click "Get Issuer Info"',
        desc: "Queries the contract's global state for the admin address. No wallet required.",
    },
    {
        step: '3',
        title: 'Verify the institution address',
        desc: "Cross-reference the returned address with the institution's publicly listed Algorand address.",
    },
    {
        step: '4',
        title: 'Check the credential ASA',
        desc: "Use the student's Asset ID on AlgoExplorer to verify manager/freeze/clawback all reference the contract, proving authenticity.",
    },
];

export default function RecruiterPage() {
    const [issuerAddress, setIssuerAddress] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleGetIssuer() {
        if (APP_ID === 0) {
            return toast.error('VITE_APP_ID is not configured. Set it in your .env file.');
        }
        setLoading(true);
        setIssuerAddress(null);
        try {
            const addr = await getIssuerInfo();
            setIssuerAddress(addr);
            toast.success('Issuer info retrieved!');
        } catch (err) {
            toast.error(err?.message || 'Failed to fetch issuer info.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>Recruiter Verification Portal</h2>
                <p>
                    Independently verify academic credentials on the Algorand blockchain.
                    No wallet required — all data is read directly from the contract.
                </p>
            </div>

            {/* ── Get Issuer Info ── */}
            <div className="glass-card" style={{ padding: '36px', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <h3 style={{ marginBottom: 12 }}>🏛️ Verify Credential Issuer</h3>
                        <p style={{ fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.7 }}>
                            Query the smart contract to retrieve the issuing institution's on-chain address.
                            This address is set at deployment and cannot be changed — making it a cryptographically
                            verifiable proof of the institution's identity.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={handleGetIssuer}
                            disabled={loading}
                            id="btn-get-issuer-info"
                        >
                            {loading ? <><span className="spinner" /> Querying&hellip;</> : '🔍 Get Issuer Info'}
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        minWidth: 280,
                        background: 'rgba(52, 211, 153, 0.06)',
                        border: '1px solid rgba(52, 211, 153, 0.15)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                    }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            🔒 How it works
                        </div>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                'No wallet or authentication required',
                                'Reads the admin address from global state',
                                'Simulate-only — no transaction fees',
                                '100% verifiable on-chain',
                            ].map((item) => (
                                <li key={item} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: 18, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 0, color: 'var(--accent-green)' }}>✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {issuerAddress && (
                    <div className="result-box" style={{ marginTop: 28 }}>
                        <h4>✅ Issuing Institution Verified</h4>
                        <div className="info-grid" style={{ marginTop: 16 }}>
                            <div className="info-row">
                                <span className="info-label">Admin Address</span>
                                <span className="info-value" id="issuer-address-display">{issuerAddress}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">App ID</span>
                                <a
                                    className="info-value"
                                    href={getExplorerUrl('application', APP_ID)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {APP_ID} ↗
                                </a>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Explorer</span>
                                <a
                                    className="info-value"
                                    href={getExplorerUrl('address', issuerAddress)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    View on AlgoExplorer ↗
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── FAQ section ── */}
            <div className="glass-card" style={{ padding: '32px' }}>
                <h3 style={{ marginBottom: 20 }}>❓ How to Verify a Credential</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                    {FAQ_ITEMS.map(({ step, title, desc }) => (
                        <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div style={{
                                flexShrink: 0,
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'var(--gradient-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                color: '#fff',
                            }}>
                                {step}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{title}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
