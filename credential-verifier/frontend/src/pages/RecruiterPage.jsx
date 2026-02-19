
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import algosdk from 'algosdk';
import { indexerClient, APP_ID, getExplorerUrl } from '../lib/algorand';
import toast from 'react-hot-toast';

export default function RecruiterPage() {
    const [searchParams] = useSearchParams();
    const [address, setAddress] = useState(searchParams.get('address') || '');
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        const addrParam = searchParams.get('address');
        if (addrParam) {
            setAddress(addrParam);
            handleVerify(addrParam);
        }
    }, [searchParams]);

    async function handleVerify(targetAddress) {
        if (!targetAddress) return;

        // Basic address validation
        if (!algosdk.isValidAddress(targetAddress)) {
            toast.error("Invalid Algorand address");
            return;
        }

        setLoading(true);
        setSearched(true);
        setCredentials([]);

        try {
            // 1. Get App Address (Issuer)
            // 1. Get App Address (Issuer)
            const appAddressObj = algosdk.getApplicationAddress(parseInt(APP_ID));
            const appAddress = appAddressObj.toString();
            console.log("App Address (Issuer):", appAddress);

            // 2. Fetch all assets held by the student
            const accountInfo = await indexerClient.lookupAccountAssets(targetAddress).do();
            const assets = accountInfo.assets || [];

            // 3. Filter for valid credentials
            // - Student must hold specific amount > 0 (usually 1 for NFT)
            // - Asset Creator must be the App Address
            const validCreds = [];

            for (const assetHolder of assets) {
                if (assetHolder.amount > 0) {
                    // Support both SDK v3 objects (camelCase) and raw Indexer JSON (kebab-case)
                    const assetId = assetHolder['asset-id'] || assetHolder.assetId;
                    if (!assetId) continue;

                    // Fetch asset details to check creator
                    const assetInfo = await indexerClient.lookupAssetByID(assetId).do();
                    const assetParams = assetInfo.asset.params;

                    if (assetParams.creator === appAddress) {
                        validCreds.push({
                            id: assetHolder['asset-id'],
                            name: assetParams.name,
                            unitName: assetParams['unit-name'],
                            url: assetParams.url,
                            total: assetParams.total
                        });
                    }
                }
            }

            setCredentials(validCreds);
            if (validCreds.length === 0) {
                toast("No credentials found for this student.", { icon: 'ℹ️' });
            } else {
                toast.success(`Found ${validCreds.length} valid credentials!`);
            }

        } catch (e) {
            console.error(e);
            toast.error("Failed to verify credentials. See console.");
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = (e) => {
        e.preventDefault();
        handleVerify(address);
    };

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>🎓 Recruiter Verification</h2>
                <p>Verify credentials issued by the university smart contract.</p>
            </div>

            {/* Search Box */}
            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto 32px' }}>
                <form onSubmit={onSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        className="form-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter Student Algorand Address..."
                        style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !address}
                    >
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </form>
            </div>

            {/* Results */}
            {searched && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {loading ? (
                        <div className="spinner" style={{ margin: '40px auto' }} />
                    ) : credentials.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                            {credentials.map(cred => (
                                <div key={cred.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                                    {/* Verified Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        background: '#10b981',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span>✓</span> VERIFIED
                                    </div>

                                    <h3 style={{ marginTop: 0, paddingRight: '90px' }}>{cred.name}</h3>
                                    <div style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.9rem' }}>
                                        {cred.unitName}
                                    </div>

                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontFamily: 'monospace'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#94a3b8' }}>Asset ID:</span>
                                            <a
                                                href={getExplorerUrl('asset', cred.id)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: '#38bdf8', textDecoration: 'none' }}
                                            >
                                                {cred.id} ↗
                                            </a>
                                        </div>
                                        {cred.url && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>Document:</span>
                                                <a
                                                    href={cred.url.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: '#38bdf8', textDecoration: 'none' }}
                                                >
                                                    View IPFS ↗
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                            <h3>No Verified Credentials Found</h3>
                            <p style={{ color: '#94a3b8' }}>
                                This address does not hold any credentials issued by the University Smart Contract.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
