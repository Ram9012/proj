
import React, { useState } from 'react';
import algosdk from 'algosdk';
import { useWalletContext } from '../context/WalletContext';
import { algodClient } from '../lib/algorand';
import toast from 'react-hot-toast';

export default function AppLabPage() {
    const { isConnected, activeAccount, signer } = useWalletContext();

    // Form state
    const [appId, setAppId] = useState('');
    const [methodSig, setMethodSig] = useState('issue_credential(address,string,string,string)uint64');
    const [args, setArgs] = useState(['', '', '', '']); // Array of strings
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Helper to parse method signature and adjust args array size
    function handleMethodChange(e) {
        const sig = e.target.value;
        setMethodSig(sig);
        // Simple regex to count args: matches anything between commas inside parentheses
        try {
            const params = sig.match(/\((.*)\)/)?.[1];
            if (params !== undefined) {
                const count = params.trim() === '' ? 0 : params.split(',').length;
                setArgs(prev => {
                    const newArgs = [...prev];
                    // resizing array
                    if (count > newArgs.length) {
                        while (newArgs.length < count) newArgs.push('');
                    } else if (count < newArgs.length) {
                        newArgs.length = count;
                    }
                    return newArgs;
                });
            }
        } catch (err) {
            // ignore parsing errors
        }
    }

    function handleArgChange(index, value) {
        const newArgs = [...args];
        newArgs[index] = value;
        setArgs(newArgs);
    }

    function addLog(msg, type = 'info') {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    }

    async function handleExecute(e) {
        e.preventDefault();
        if (!isConnected) return toast.error("Please connect wallet");
        if (!appId) return toast.error("App ID is required");

        setLoading(true);
        addLog(`Preparing transaction for App ${appId}...`);

        try {
            const sp = await algodClient.getTransactionParams().do();
            sp.flatFee = true;
            sp.fee = 2000n; // Generic fee

            const abiMethod = algosdk.ABIMethod.fromSignature(methodSig);

            // Construct Method Args - naive parsing
            // This is a "Lab" tool, so we assume user inputs correct types or strings
            // For complex types (arrays, tuples), this simple text input might fail without JSON parsing
            const methodArgs = args.map(arg => {
                // Try to infer numbers
                if (!isNaN(arg) && arg.trim() !== '') return BigInt(arg);
                // Try to infer booleans
                if (arg === 'true') return true;
                if (arg === 'false') return false;
                return arg;
            });

            addLog(`Method: ${abiMethod.name}`);
            addLog(`Args: ${JSON.stringify(methodArgs, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);

            const atc = new algosdk.AtomicTransactionComposer();
            atc.addMethodCall({
                appID: Number(appId),
                method: abiMethod,
                methodArgs: methodArgs,
                sender: activeAccount,
                signer,
                suggestedParams: sp,
            });

            const result = await atc.execute(algodClient, 4);
            addLog(`✅ Transaction Confirmed: ${result.txIDs[0]}`);
            if (result.methodResults[0]) {
                addLog(`Returns: ${JSON.stringify(result.methodResults[0].returnValue, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);
            }
            toast.success("Execution successful");

        } catch (error) {
            console.error(error);
            addLog(`❌ Error: ${error.message}`, 'error');
            toast.error("Execution failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>🧪 App Lab</h2>
                <p>Generic interaction tool for Algorand smart contracts.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Control Panel */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Configuration</h3>

                    <div className="form-group">
                        <label className="form-label">App ID</label>
                        <input
                            className="form-input"
                            type="number"
                            placeholder="e.g. 1014"
                            value={appId}
                            onChange={e => setAppId(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Method Signature</label>
                        <input
                            className="form-input"
                            placeholder="method(type,type)void"
                            value={methodSig}
                            onChange={handleMethodChange}
                        />
                        <span className="form-hint">e.g. hello(string)string</span>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <label className="form-label">Arguments ({args.length})</label>
                        {args.map((arg, idx) => (
                            <div key={idx} style={{ marginBottom: '8px' }}>
                                <input
                                    className="form-input"
                                    placeholder={`Arg ${idx + 1}`}
                                    value={arg}
                                    onChange={e => handleArgChange(idx, e.target.value)}
                                />
                            </div>
                        ))}
                        {args.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>No arguments required.</p>}
                    </div>

                    <button
                        className="btn btn-primary btn-full"
                        style={{ marginTop: '24px' }}
                        onClick={handleExecute}
                        disabled={loading || !isConnected}
                    >
                        {loading ? 'Executing...' : '🚀 Execute'}
                    </button>
                    {!isConnected && <p className="error-text" style={{ marginTop: 8, textAlign: 'center' }}>Connect wallet to execute</p>}
                </div>

                {/* Console Output */}
                <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '500px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Console Output</h3>
                    </div>
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {logs.length === 0 && <span style={{ opacity: 0.5 }}>Waiting for input...</span>}
                        {logs.map((log, i) => (
                            <div key={i} style={{ marginBottom: '4px', color: log.includes('❌') ? '#ff6b6b' : '#a8a29e' }}>
                                {log}
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <button className="btn-small" onClick={() => setLogs([])} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                            Clear Logs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
