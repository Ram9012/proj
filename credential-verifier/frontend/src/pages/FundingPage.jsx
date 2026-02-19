import React, { useState, useEffect } from 'react';
import algosdk from 'algosdk';
import { useWalletContext } from '../context/WalletContext';
import { algodClient } from '../lib/algorand';
import toast from 'react-hot-toast';
import TransactionHistory from '../components/TransactionHistory';

// KMD Client for Local Net
const KMD_TOKEN = 'a'.repeat(64);
const KMD_SERVER = 'http://127.0.0.1';
const KMD_PORT = 4002;

export default function TransactionWizardPage() {
    const { activeAccount } = useWalletContext();

    // State
    const [kmdAccounts, setKmdAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Form Fields (Lora Style)
    const [txnType, setTxnType] = useState('pay'); // 'pay' only for now
    const [sender, setSender] = useState('');
    const [receiver, setReceiver] = useState('');
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState(''); // Optional custom fee
    const [note, setNote] = useState('');

    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    // Load KMD Accounts on Mount
    useEffect(() => {
        loadKmdAccounts();
    }, []);

    // Set Default Receiver
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

            const accountsWithBalance = await Promise.all(addresses.map(async (addr) => {
                try {
                    const info = await algodClient.accountInformation(addr).do();
                    return { address: addr, balance: info.amount / 1e6 };
                } catch (e) {
                    return { address: addr, balance: 0 };
                }
            }));

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

        // 1. Clean Inputs
        const senderStr = sender.trim();
        const receiverStr = receiver.trim();
        const amountNum = Number(amount);

        if (!senderStr || !receiverStr || amount === '') {
            toast.error("Please fill in all required fields");
            return;
        }

        setSending(true);
        setStatus('Constructing transaction...');

        try {
            // 2. Setup KMD
            const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, KMD_PORT);
            const wallets = await kmd.listWallets();
            const defaultWallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');
            const { wallet_handle_token: handle } = await kmd.initWalletHandle(defaultWallet.id, '');

            // 3. Get Suggested Params
            const sp = await algodClient.getTransactionParams().do();
            if (fee) {
                sp.flatFee = true;
                sp.fee = BigInt(fee);
            }

            console.log("Txn Params:", { sender: senderStr, receiver: receiverStr, amount: amountNum, sp });

            // 4. Construct Transaction Object CAREFULLY
            // Only include defined properties. Do not spread undefined values.
            const txnParams = {
                from: senderStr,
                to: receiverStr,
                amount: BigInt(Math.floor(amountNum * 1e6)), // Convert to microAlgo
                suggestedParams: sp,
            };

            // Add note only if it exists
            if (note) {
                txnParams.note = new TextEncoder().encode(note);
            }

            // 5. Create Transaction
            const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(txnParams);

            // 6. Sign
            setStatus('Signing with KMD...');
            const signResult = await kmd.signTransaction(handle, '', txn);

            // 7. Send
            setStatus('Sending transaction...');
            const { txId } = await algodClient.sendRawTransaction(signResult).do();

            setStatus(`Waiting for confirmation (${txId.slice(0, 8)})...`);
            await algosdk.waitForConfirmation(algodClient, txId, 4);

            toast.success(`Sent ${amount} ALGO!`);
            setStatus(null);

            loadKmdAccounts(); // Refresh balances
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
                <h2>Build Transaction</h2>
                <p>Create and send transactions on LocalNet.</p>
            </div>

            <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Transaction Details</h3>
                </div>

                <form onSubmit={handleSend} style={{ padding: '24px' }}>
                    {/* Transaction Type */}
                    <div className="form-group">
                        <label className="form-label">Transaction Type</label>
                        <select
                            className="form-input"
                            value={txnType}
                            disabled
                        >
                            <option value="pay">Payment (pay)</option>
                        </select>
                    </div>

                    {/* Sender */}
                    <div className="form-group">
                        <label className="form-label">Sender *</label>
                        <select
                            className="form-input"
                            value={sender}
                            onChange={(e) => setSender(e.target.value)}
                            style={{ fontFamily: 'monospace' }}
                        >
                            {loadingAccounts && <option>Loading accounts...</option>}
                            {kmdAccounts.map(acc => (
                                <option key={acc.address} value={acc.address}>
                                    {acc.address} ({acc.balance.toLocaleString()} ALGO)
                                </option>
                            ))}
                        </select>
                        <div className="form-text">Account to pay from. Sends the transaction and pays the fee.</div>
                    </div>

                    {/* Receiver */}
                    <div className="form-group">
                        <label className="form-label">Receiver *</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                className="form-input"
                                value={receiver}
                                onChange={(e) => setReceiver(e.target.value)}
                                placeholder="Receiver Address"
                                style={{ fontFamily: 'monospace', flex: 1 }}
                                required
                            />
                            {activeAccount && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setReceiver(activeAccount.toString())}
                                >
                                    Me
                                </button>
                            )}
                        </div>
                        <div className="form-text">Account to receive the amount.</div>
                    </div>

                    {/* Amount */}
                    <div className="form-group">
                        <label className="form-label">Amount to pay (ALGO) *</label>
                        <input
                            className="form-input"
                            type="number"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                        <div className="form-text">Amount to pay the 'Receiver' account</div>
                    </div>

                    {/* Fee & Note (Collapsible) */}
                    <div style={{ marginBottom: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Note (Optional)</label>
                            <input
                                className="form-input"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="A note for the transaction"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Custom Fee (µAlgo) - Optional</label>
                            <input
                                className="form-input"
                                type="number"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                placeholder="Default (Automatic)"
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={sending || loadingAccounts || !sender}
                        style={{ width: '100%', padding: '12px' }}
                    >
                        {sending ? 'Sending...' : 'Send Transaction'}
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

            {/* Transaction History for Selected Sender */}
            {sender && (
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <TransactionHistory address={sender} />
                </div>
            )}
        </div>
    );
}
