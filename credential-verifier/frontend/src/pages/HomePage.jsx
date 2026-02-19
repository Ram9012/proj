import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const ROLES = [
    {
        id: 'institute',
        icon: '🏫',
        title: 'Educational Institute',
        subtitle: 'Admin Portal',
        description:
            'Issue blockchain-backed credential NFTs to students, transfer them to student wallets, and revoke credentials when necessary.',
        features: ['Issue credentials', 'Transfer to students', 'Revoke credentials'],
        to: '/institute',
        gradient: 'var(--gradient-card-institute)',
        accentColor: 'var(--accent-purple)',
        btnLabel: 'Open Admin Portal',
        btnId: 'btn-go-institute',
    },
    {
        id: 'student',
        icon: '🎓',
        title: 'Student',
        subtitle: 'Credential Wallet',
        description:
            'View your earned academic credentials stored on the Algorand blockchain. Opt in to receive new credentials and track your history.',
        features: ['View credentials', 'Opt-in to ASA', 'Transaction history'],
        to: '/student',
        gradient: 'var(--gradient-card-student)',
        accentColor: 'var(--accent-blue)',
        btnLabel: 'Open My Wallet',
        btnId: 'btn-go-student',
    },
    {
        id: 'recruiter',
        icon: '🔍',
        title: 'Recruiter',
        subtitle: 'Credential Verifier',
        description:
            'Independently verify the authenticity and issuer of any academic credential by querying the smart contract on-chain.',
        features: ['Verify issuer identity', 'Check credential validity', 'On-chain proof'],
        to: '/recruiter',
        gradient: 'var(--gradient-card-recruiter)',
        accentColor: 'var(--accent-green)',
        btnLabel: 'Verify Credentials',
        btnId: 'btn-go-recruiter',
    },
];

export default function HomePage() {
    return (
        <div className="home fade-in">
            {/* Hero */}
            <section className="home-hero">
                <div className="home-hero-badge">
                    <span className="hero-badge-dot" />
                    Powered by Algorand Blockchain
                </div>
                <h1 className="home-hero-title">
                    Academic Credentials,{' '}
                    <span className="gradient-text">Verified On-Chain</span>
                </h1>
                <p className="home-hero-subtitle">
                    A decentralized system for issuing, transferring, and verifying tamper-proof academic
                    credentials as Algorand Standard Assets. No middlemen. No forgery.
                </p>
            </section>

            {/* Role cards */}
            <section className="home-roles">
                {ROLES.map((role, idx) => (
                    <div
                        key={role.id}
                        className="role-card glass-card fade-in"
                        style={{ animationDelay: `${idx * 0.1}s`, background: role.gradient }}
                    >
                        <div className="role-card-icon">{role.icon}</div>
                        <div className="role-card-tag" style={{ color: role.accentColor }}>
                            {role.subtitle}
                        </div>
                        <h3 className="role-card-title">{role.title}</h3>
                        <p className="role-card-desc">{role.description}</p>
                        <ul className="role-card-features">
                            {role.features.map((f) => (
                                <li key={f} style={{ '--dot-color': role.accentColor }}>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link to={role.to} className="btn btn-secondary btn-full role-card-btn" id={role.btnId}>
                            {role.btnLabel} →
                        </Link>
                    </div>
                ))}
            </section>

            {/* Stats strip */}
            <section className="home-stats glass-card">
                {[
                    { value: 'ARC-4', label: 'Smart Contract Standard' },
                    { value: 'ASA', label: 'Credential Representation' },
                    { value: 'TestNet', label: 'Network' },
                    { value: '0 Forgery', label: 'Blockchain Guarantee' },
                ].map(({ value, label }) => (
                    <div key={label} className="home-stat">
                        <div className="home-stat-value">{value}</div>
                        <div className="home-stat-label">{label}</div>
                    </div>
                ))}
            </section>
        </div>
    );
}
