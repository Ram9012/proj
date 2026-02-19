import React, { useState, useEffect } from 'react';
import algosdk from 'algosdk';
import { useWalletContext } from '../context/WalletContext';
import { algodClient } from '../lib/algorand';
import toast from 'react-hot-toast';

// KMD Client for LocalNet
const KMD_TOKEN = 'a'.repeat(64);
const KMD_SERVER = 'http://127.0.0.1';
const KMD_PORT = 4002;

export default function TransactionWizardPage() {
    const { activeAccount } = useWalletContext();

    // State
    const [kmdAccounts, setKmdAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [sender, setSender] = useState('');
    const [receiver, setReceiver] = useState('');
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState('');
    const [note, setNote] = useState('');

    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    // Load KMD Accounts on Mount
    useEffect(() => {
        loadKmdAccounts();
    }, []);

    // Set Default Receiver to Active Wallet
    useEffect(() => {
        if (activeAccount && !receiver) setReceiver(activeAccount.toString());
    }, [activeAccount]);

    async function loadKmdAccounts() {
        setLoadingAccounts(true);
        setStatus('Connecting to LocalNet KMD...');
        try {
            const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, KMD_PORT);
            const wallets = await kmd.listWallets();
            const defaultWallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');

            if (!defaultWallet) throw new Error("LocalNet default wallet not found. Is LocalNet running?");

            const { wallet_handle_token: handle } = await kmd.initWalletHandle(defaultWallet.id, '');
            const { addresses } = await kmd.listKeys(handle);

            // Fetch balances for all addresses
            const accountsWithBalance = await Promise.all(addresses.map(async (addr) => {
                try {
                    const info = await algodClient.accountInformation(addr).do();
                    return { address: addr, balance: info.amount / 1e6 }; // Convert to ALGO
                } catch (e) {
                    return { address: addr, balance: 0 };
                }
            }));

            // Sort by balance (descending)
            accountsWithBalance.sort((a, b) => b.balance - a.balance);

            setKmdAccounts(accountsWithBalance);
            if (accountsWithBalance.length > 0) {
                setSender(accountsWithBalance[0].address);
            }
            setStatus(null);
        } catch (e) {
            console.error(e);
            setStatus(`KMD Error: ${e.message}`);
        } finally {
            setLoadingAccounts(false);
        }
    }

    async function handleSend(e) {
        e.preventDefault();
        if (!sender || !receiver || !amount) return;

        setSending(true);
        setStatus('Constructing transaction...');

        try {
            const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, KMD_PORT);
            const wallets = await kmd.listWallets();
            const defaultWallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');
            const { wallet_handle_token: handle } = await kmd.initWalletHandle(defaultWallet.id, '');

            const sp = await algodClient.getTransactionParams().do();

            // Custom Fee
            if (fee) {
                sp.flatFee = true;
                sp.fee = BigInt(fee);
            }

            // Ensure receiver is a string and valid
            const receiverStr = receiver.toString().trim();
            const senderStr = sender.toString().trim();

            console.log("Transaction Details (Pre-Check):", {
                sender: senderStr,
                receiver: receiverStr,
                amount,
                senderValid: algosdk.isValidAddress(senderStr),
                receiverValid: algosdk.isValidAddress(receiverStr)
            });
            console.log("Suggested Params:", sp);

            if (!senderStr) throw new Error("Sender address is missing");
            if (!receiverStr) throw new Error("Receiver address is missing");
            if (!algosdk.isValidAddress(senderStr)) throw new Error(`Invalid Sender Address: "${senderStr}"`);
            if (!algosdk.isValidAddress(receiverStr)) throw new Error(`Invalid Receiver Address: "${receiverStr}"`);

            if (!algosdk.isValidAddress(senderStr)) throw new Error(`Invalid Sender Address: "${senderStr}"`);
            if (!algosdk.isValidAddress(receiverStr)) throw new Error(`Invalid Receiver Address: "${receiverStr}"`);

            // Use positional arguments (v2 style but supported in v3) for maximum stability
            // makePaymentTxnWithSuggestedParams(from, to, amount, closeRemainderTo, note, suggestedParams, rekeyTo)
            const txn = algosdk.makePaymentTxnWithSuggestedParams(
                senderStr,
                receiverStr,
                BigInt(Math.floor(Number(amount) * 1e6)),
                undefined, // closeRemainderTo
                note ? new TextEncoder().encode(note) : undefined,
                sp
            );

            setStatus('Signing with KMD...');
            const signResult = await kmd.signTransaction(handle, '', txn);

            setStatus('Sending transaction...');
            const { txId } = await algodClient.sendRawTransaction(signResult).do();

            setStatus(`Waiting for confirmation (${txId.slice(0, 8)})...`);
            await algosdk.waitForConfirmation(algodClient, txId, 4);

            toast.success(`Sent ${amount} ALGO!`);
            setStatus(null);

            // Reload balances
            loadKmdAccounts();
        } catch (e) {
            console.error(e);
            toast.error(e.message);
            setStatus(`Error: ${e.message}`);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>⚡ Transaction Wizard</h2>
                <p>Construct and send transactions from LocalNet accounts.</p>
            </div>

            <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', padding: '32px' }}>
                <form onSubmit={handleSend}>
                    {/* SENDER SELECTION */}
                    <div className="form-group">
                        <label className="form-label">Sender (From KMD)</label>
                        {loadingAccounts ? (
                            <div className="spinner" />
                        ) : (
                            <select
                                className="form-input"
                                value={sender}
                                onChange={(e) => setSender(e.target.value)}
                            >
                                {kmdAccounts.map(acc => (
                                    <option key={acc.address} value={acc.address}>
                                        {acc.address.slice(0, 8)}...{acc.address.slice(-6)} — {acc.balance.toLocaleString()} ALGO
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* RECEIVER SELECTION */}
                    <div className="form-group">
                        <label className="form-label">Receiver</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                className="form-input"
                                value={receiver}
                                onChange={(e) => setReceiver(e.target.value)}
                                placeholder="Receiver Address"
                                required
                                style={{ flex: 1 }}
                            />
                            {activeAccount && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setReceiver(activeAccount.toString())}
                                    title="Use my wallet address"
                                >
                                    My Wallet
                                </button>
                            )}
                        </div>
                    </div>

                    {/* AMOUNT & FEE */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Amount (ALGO)</label>
                            <input
                                className="form-input"
                                type="number"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 0.5 }}>
                            <label className="form-label">Fee (µAlgo)</label>
                            <input
                                className="form-input"
                                type="number"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                placeholder="Default"
                            />
                        </div>
                    </div>

                    {/* NOTE */}
                    <div className="form-group">
                        <label className="form-label">Note (Optional)</label>
                        <input
                            className="form-input"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Transaction note..."
                        />
                    </div>

                    {/* SUBMIT */}
                    <button
                        className="btn btn-primary btn-full"
                        type="submit"
                        disabled={sending || loadingAccounts || !sender}
                        style={{ marginTop: 16 }}
                    >
                        {sending ? 'Sending...' : '✅ Sign & Send'}
                    </button>

                    {/* STATUS MESSAGE */}
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
