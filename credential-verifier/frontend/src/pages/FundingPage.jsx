
import React, { useState, useEffect } from 'react';
import algosdk from 'algosdk';
import { useWalletContext } from '../context/WalletContext';
import { algodClient } from '../lib/algorand';
import toast from 'react-hot-toast';

// KMD Client for LocalNet
// Note: In a real app, this should be proxied via backend to avoid exposing tokens,
// but for a LocalNet dev tool, this is acceptable.
const KMD_TOKEN = 'a'.repeat(64);
const KMD_SERVER = 'http://127.0.0.1';
const KMD_PORT = 4002; // Standard SDK port, but we saw issues earlier. 
// We will try to make this configurable or robust.

export default function FundingPage() {
    const { activeAccount } = useWalletContext();
    const [targetAddress, setTargetAddress] = useState(activeAccount || '');
    const [amount, setAmount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        if (activeAccount) setTargetAddress(activeAccount);
    }, [activeAccount]);

    async function handleFund(e) {
        e.preventDefault();
        setLoading(true);
        setStatus('Connecting to KMD...');

        try {
            const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, KMD_PORT);

            // 1. Get a funded account from KMD (default wallet)
            const wallets = await kmd.listWallets();
            const defaultWallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');

            if (!defaultWallet) throw new Error("LocalNet default wallet not found");

            const { wallet_handle_token: handle } = await kmd.initWalletHandle(defaultWallet.id, '');
            const { addresses } = await kmd.listKeys(handle);

            // Find address with most funds
            let funder = null;
            let maxBal = -1n;

            setStatus('Finding funder account...');
            for (const addr of addresses) {
                try {
                    const info = await algodClient.accountInformation(addr).do();
                    if (BigInt(info.amount) > maxBal) {
                        maxBal = BigInt(info.amount);
                        funder = addr;
                    }
                } catch (e) { /* ignore */ }
            }

            if (!funder || maxBal < BigInt(amount * 1e6)) {
                throw new Error("No funded account found in LocalNet KMD");
            }

            // 2. Send transaction
            setStatus(`Sending ${amount} ALGO from ${funder.slice(0, 8)}...`);

            const sp = await algodClient.getTransactionParams().do();
            const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                from: funder,
                to: targetAddress,
                amount: BigInt(amount * 1e6),
                suggestedParams: sp
            });

            // Sign with KMD
            const signResult = await kmd.signTransaction(handle, '', txn);
            const { txId } = await algodClient.sendRawTransaction(signResult).do();

            setStatus('Waiting for confirmation...');
            await algosdk.waitForConfirmation(algodClient, txId, 4);

            toast.success(`Funded ${amount} ALGO!`);
            setStatus(null);

        } catch (error) {
            console.error(error);
            toast.error(`Funding failed: ${error.message}`);

            if (error.message.includes('ECONNREFUSED')) {
                setStatus('Error: Could not connect to LocalNet KMD (Port 4002). Make sure LocalNet is running.');
            } else {
                setStatus(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>💰 Funding Dispenser</h2>
                <p>Get test Algos for your LocalNet accounts.</p>
            </div>

            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💎</div>
                    <p style={{ color: '#94a3b8' }}>
                        This tool connects to your LocalNet KMD to transfer funds from the genesis accounts.
                    </p>
                </div>

                <form onSubmit={handleFund}>
                    <div className="form-group">
                        <label className="form-label">Receiver Address</label>
                        <input
                            className="form-input"
                            value={targetAddress}
                            onChange={(e) => setTargetAddress(e.target.value)}
                            placeholder="Address to fund"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Amount (ALGO)</label>
                        <input
                            className="form-input"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            max="1000"
                            required
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-full"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Dispensing...' : '💸 Receive Funds'}
                    </button>

                    {status && (
                        <div style={{
                            marginTop: '20px',
                            padding: '12px',
                            borderRadius: '8px',
                            background: status.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                            color: status.startsWith('Error') ? '#fca5a5' : '#7dd3fc',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            {status}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
