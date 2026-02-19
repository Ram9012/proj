import React, { useState, useCallback } from 'react';
import algosdk from 'algosdk';
import QRCode from 'react-qr-code';
import { useWalletContext } from '../context/WalletContext';
import { optInToAsset } from '../lib/contract';
import { getAccountAssets, getAssetInfo, getExplorerUrl } from '../lib/algorand';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

export default function StudentPage() {
    const { isConnected, activeAccount, signer } = useWalletContext();

    const [addressInput, setAddressInput] = useState('');
    const [lookupAddress, setLookupAddress] = useState('');
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [optInAssetId, setOptInAssetId] = useState('');
    const [optInFee, setOptInFee] = useState('');
    const [optInLoading, setOptInLoading] = useState(false);

    // QR Code State
    const [showQR, setShowQR] = useState(false);

    // Auto-fill with connected wallet
    function handleUseMine() {
        if (activeAccount) setAddressInput(activeAccount);
    }

    async function handleLookup(e) {
        e.preventDefault();
        if (!addressInput.trim()) return toast.error('Enter an Algorand address.');
        setLoading(true);
        setLookupAddress(addressInput.trim());
        setAssets([]);
        try {
            const rawAssets = await getAccountAssets(addressInput.trim());
            console.log("Raw Assets:", rawAssets);

            // For each ASA, fetch detailed info
            const detailed = await Promise.all(
                rawAssets.map(async (holding, index) => {
                    // Support both SDK v3 objects (camelCase) and raw Indexer JSON (kebab-case)
                    const id = holding.assetId || holding['asset-id'];
                    const amount = holding.amount;
                    const isFrozen = holding.isFrozen !== undefined ? holding.isFrozen : holding['is-frozen'];

                    if (!id) return null; // Skip invalid assets

                    const info = await getAssetInfo(id);
                    return {
                        id: id.toString(), // Ensure ID is string for display/key
                        amount: amount.toString(), // Ensure BigInt is string
                        frozen: isFrozen,
                        name: info?.params?.name || `ASA #${id}`,
                        unitName: info?.params?.['unit-name'] || '',
                        url: info?.params?.url || '',
                        total: info?.params?.total,
                        uniqueKey: `${id}-${index}`
                    };
                })
            );
            setAssets(detailed.filter(a => a !== null));
            if (detailed.length === 0) {
                toast('No ASA holdings found for this address.', { icon: 'ℹ️' });
            }
        } catch (err) {
            toast.error('Failed to fetch account info. Check the address.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleOptIn(e) {
        e.preventDefault();
        if (!isConnected) return toast.error('Connect wallet first.');
        if (!optInAssetId) return toast.error('Enter an Asset ID to opt in.');
        setOptInLoading(true);
        try {
            const { txId } = await optInToAsset(activeAccount, signer, optInAssetId, optInFee);
            toast.success(`Opted in to ASA ${optInAssetId}!`);
            setOptInAssetId('');
            setOptInFee('');
        } catch (err) {
            toast.error(err?.message || 'Opt-in failed.');
            console.error(err);
        } finally {
            setOptInLoading(false);
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>Student Credential Wallet</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <p style={{ margin: 0 }}>View blockchain credentials and opt in to receive new ones.</p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                                const addr = addressInput.trim();
                                if (algosdk.isValidAddress(addr)) {
                                    navigator.clipboard.writeText(addr);
                                    toast.success("Address copied! 📋");
                                } else {
                                    toast.error("Please enter a valid Algorand address to share.");
                                }
                            }}
                        >
                            📋 Copy Address
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                                const addr = addressInput.trim();
                                if (algosdk.isValidAddress(addr)) {
                                    setShowQR(!showQR);
                                } else {
                                    toast.error("Please enter a valid Algorand address to generate QR.");
                                }
                            }}
                        >
                            📱 {showQR ? 'Hide QR' : 'Show QR'}
                        </button>
                    </div>
                </div>

                {/* QR Code Modal / Inline */}
                {showQR && algosdk.isValidAddress(addressInput.trim()) && (
                    <div className="fade-in" style={{
                        marginTop: '20px',
                        padding: '24px',
                        background: 'white',
                        borderRadius: '16px',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <QRCode
                            value={`${window.location.origin}/verify?address=${addressInput.trim()}`}
                            size={200}
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                        <span style={{ color: '#333', fontSize: '0.9rem', fontWeight: 600 }}>Scan to Verify: {addressInput.slice(0, 4)}...</span>
                    </div>
                )}
            </div>

            {/* ── Lookup section ── */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>🔍 View Credentials</h3>
                <form onSubmit={handleLookup} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input
                        className="form-input"
                        placeholder="Enter Algorand wallet address…"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        style={{ flex: 1, minWidth: 260 }}
                        id="student-address-input"
                    />
                    {isConnected && (
                        <button type="button" className="btn btn-secondary" onClick={handleUseMine} id="btn-use-my-wallet">
                            Use My Wallet
                        </button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={loading} id="btn-lookup-credentials">
                        {loading ? <><span className="spinner" /> Loading…</> : '🔍 Look Up'}
                    </button>
                </form>
            </div>

            {/* ── Credential cards ── */}
            {lookupAddress && !loading && (
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                            ASA Holdings &nbsp;
                            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{assets.length}</span>
                        </h3>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {lookupAddress.slice(0, 8)}…{lookupAddress.slice(-6)}
                        </span>
                    </div>

                    {assets.length === 0 ? (
                        <div className="glass-card empty-state">
                            <div className="empty-state-icon">🎓</div>
                            <h3>No credentials found</h3>
                            <p>This wallet has not received any ASA credentials yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {assets.map((asset) => (
                                <CredentialCard key={asset.uniqueKey} asset={asset} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Opt-In section ── */}
            <div className="glass-card" style={{ padding: '28px' }}>
                <h3 style={{ marginBottom: 8 }}>📬 Opt In to Receive a Credential</h3>
                <p style={{ marginBottom: 20, fontSize: '0.9rem' }}>
                    Before an institute can transfer a credential to your wallet, you must opt in to the specific ASA.
                    Connect your wallet and enter the Asset ID shared by your institute.
                </p>

                {!isConnected && (
                    <div className="wallet-required">
                        <span>🔐</span>
                        <p>Connect your wallet to opt in to an ASA.</p>
                    </div>
                )}

                <form onSubmit={handleOptIn} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input
                        className="form-input"
                        type="number"
                        placeholder="Asset ID (e.g. 1234567890)"
                        value={optInAssetId}
                        onChange={(e) => setOptInAssetId(e.target.value)}
                        disabled={!isConnected || optInLoading}
                        style={{ flex: 1, minWidth: 200 }}
                        id="opt-in-asset-id"
                    />
                    <input
                        className="form-input"
                        type="number"
                        placeholder="Fee (µAlgo)"
                        value={optInFee}
                        onChange={(e) => setOptInFee(e.target.value)}
                        disabled={!isConnected || optInLoading}
                        style={{ width: 120 }}
                        title="Transaction Fee"
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!isConnected || optInLoading}
                        id="btn-opt-in-asa"
                    >
                        {optInLoading ? <><span className="spinner" /> Opting in…</> : '📬 Opt In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function CredentialCard({ asset }) {
    const isFrozen = asset.frozen;
    const isNFT = asset.total === 1;

    return (
        <div className="credential-card">
            <div className="credential-card-top">
                <div>
                    <div className="credential-card-title">
                        {isNFT ? '🎓' : '📄'} {asset.name}
                    </div>
                    <div className="credential-card-meta">
                        Unit: <strong>{asset.unitName || '—'}</strong> &nbsp;·&nbsp; Asset ID:{' '}
                        <a
                            href={getExplorerUrl('asset', asset.id)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontFamily: 'monospace' }}
                        >
                            {asset.id} ↗
                        </a>
                    </div>
                </div>
                <StatusBadge status={isFrozen ? 'revoked' : 'active'} />
            </div>

            {asset.url && (
                <div className="credential-card-meta">
                    📎{' '}
                    <a href={asset.url.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${asset.url.slice(7)}` : asset.url}
                        target="_blank" rel="noreferrer">
                        View Certificate ↗
                    </a>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-pending" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-blue)', borderColor: 'rgba(56,189,248,0.3)' }}>
                    Amount: {asset.amount}
                </span>
                {isNFT && (
                    <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)', borderColor: 'rgba(139,92,246,0.25)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600 }}>
                        🔒 Non-Transferable NFT
                    </span>
                )}
            </div>
        </div>
    );
}
