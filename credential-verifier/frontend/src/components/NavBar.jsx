import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext';
import WalletButton from './WalletButton';
import './NavBar.css';

export default function NavBar() {
    const location = useLocation();
    const { isConnected, activeAccount } = useWalletContext();

    const navLinks = [
        { to: '/institute', label: '🏫 Institute' },
        { to: '/student', label: '🎓 Student' },
        { to: '/recruiter', label: '🔍 Recruiter' },
        { to: '/app-lab', label: '🧪 App Lab' },
        { to: '/funding', label: '💰 Funding' },
    ];

    return (
        <header className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="navbar-logo">
                    <span className="navbar-logo-icon">⛓️</span>
                    <span className="navbar-logo-text">CredVerify</span>
                </Link>

                <nav className="navbar-links">
                    {navLinks.map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`navbar-link ${location.pathname.startsWith(to) ? 'active' : ''}`}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <WalletButton />
            </div>
        </header>
    );
}
