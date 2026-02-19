import React from 'react';
import { useWalletContext } from '../context/WalletContext';
import './WalletButton.css';

export default function WalletButton() {
    const { isConnected, activeAccount, isConnecting, connect, disconnect } = useWalletContext();

    function truncate(addr) {
        if (!addr) return '';
        const s = addr.toString();
        return `${s.slice(0, 6)}…${s.slice(-4)}`;
    }

    if (isConnected) {
        return (
            <div className="wallet-status">
                <div className="wallet-dot" />
                <span className="wallet-addr">{truncate(activeAccount)}</span>
                <button className="btn btn-secondary btn-sm" onClick={disconnect} id="btn-disconnect">
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            className="btn btn-primary btn-sm"
            onClick={connect}
            disabled={isConnecting}
            id="btn-connect-wallet"
        >
            {isConnecting ? <span className="spinner" /> : '🔗'}
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
    );
}
