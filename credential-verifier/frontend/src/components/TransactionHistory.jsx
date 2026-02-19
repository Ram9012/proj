import React, { useState, useEffect } from 'react';
import { indexerClient, getExplorerUrl } from '../lib/algorand';

export default function TransactionHistory({ address }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (address) {
            fetchHistory();
        }
    }, [address]);

    async function fetchHistory() {
        setLoading(true);
        try {
            const info = await indexerClient.lookupAccountTransactions(address).limit(20).do();
            setTransactions(info.transactions || []);
        } catch (e) {
            console.error("Error fetching history:", e);
        } finally {
            setLoading(false);
        }
    }

    // Helper to format timestamp
    const formatTime = (ts) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleString();
    };

    // Helper to truncate address
    const shortAddr = (addr) => {
        if (!addr) return '-';
        if (addr === address) return <span style={{ color: '#fff', fontWeight: 'bold' }}>Me ({addr.slice(0, 4)}...{addr.slice(-4)})</span>;
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    if (!address) return null;

    return (
        <div className="glass-card" style={{ marginTop: '32px', padding: '0', overflow: 'hidden' }}>
            <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Transaction History</h3>
                <button
                    onClick={fetchHistory}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '12px 16px' }}>Tx ID</th>
                            <th style={{ padding: '12px 16px' }}>Round</th>
                            <th style={{ padding: '12px 16px' }}>Timestamp</th>
                            <th style={{ padding: '12px 16px' }}>From</th>
                            <th style={{ padding: '12px 16px' }}>To</th>
                            <th style={{ padding: '12px 16px' }}>Type</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Fee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                    {loading ? 'Loading...' : 'No transactions found'}
                                </td>
                            </tr>
                        ) : (
                            transactions.map(tx => {
                                const isSender = tx.sender === address;
                                const payment = tx['payment-transaction'];
                                const amount = payment?.amount;
                                const receiver = payment?.receiver;
                                const fee = tx.fee;

                                return (
                                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {/* Tx ID */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <a
                                                href={getExplorerUrl('tx', tx.id)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: '#38bdf8', textDecoration: 'none', fontFamily: 'monospace' }}
                                            >
                                                {tx.id.slice(0, 8)}...
                                            </a>
                                        </td>

                                        {/* Round */}
                                        <td style={{ padding: '12px 16px', color: '#38bdf8' }}>
                                            {tx['confirmed-round']}
                                        </td>

                                        {/* Timestamp */}
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                                            {formatTime(tx['round-time'])}
                                        </td>

                                        {/* From */}
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8' }}>
                                            {shortAddr(tx.sender)}
                                        </td>

                                        {/* To */}
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8' }}>
                                            {shortAddr(receiver || (tx['asset-transfer-transaction']?.receiver))}
                                        </td>

                                        {/* Type */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: tx['tx-type'] === 'pay' ? '#f43f5e' : '#3b82f6',
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase'
                                            }}>
                                                {tx['tx-type'] === 'pay' ? 'Payment' : tx['tx-type']}
                                            </span>
                                        </td>

                                        {/* Amount */}
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            {amount !== undefined ? (
                                                <span style={{ color: '#fff', fontWeight: 'bold' }}>
                                                    {(Number(amount) / 1e6).toLocaleString()} <span style={{ fontSize: '0.7em', color: '#94a3b8' }}>ALGO</span>
                                                </span>
                                            ) : '-'}
                                        </td>

                                        {/* Fee */}
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>
                                            {fee ? (Number(fee) / 1e6).toFixed(4) : 0}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
