
import { useState, useEffect, useCallback } from 'react';
import algosdk from 'algosdk';

const DEFAULT_MNEMONIC = "wave fold crime bubble curious vanish office cushion melody bless unusual option feature afford must renew grief day harbor rose pyramid adult drink above nose";

export function useWallet() {
    const [activeAccount, setActiveAccount] = useState(null);
    const [privateKey, setPrivateKey] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Recover from local storage
        const stored = localStorage.getItem('local_wallet_mnemonic');
        if (stored) {
            try {
                const account = algosdk.mnemonicToSecretKey(stored);
                setActiveAccount(account.addr);
                setPrivateKey(account);
            } catch (e) {
                console.error("Invalid stored mnemonic", e);
                localStorage.removeItem('local_wallet_mnemonic');
            }
        }
    }, []);

    const connect = useCallback(async () => {
        setIsConnecting(true);
        // Small delay to let UI show loading state
        await new Promise(r => setTimeout(r, 100));

        const mnemonic = window.prompt("Enter your 25-word mnemonic:", DEFAULT_MNEMONIC);

        if (mnemonic) {
            try {
                const account = algosdk.mnemonicToSecretKey(mnemonic.trim());
                setActiveAccount(account.addr);
                setPrivateKey(account);
                localStorage.setItem('local_wallet_mnemonic', mnemonic.trim());
            } catch (e) {
                alert("Invalid mnemonic: " + e.message);
            }
        }
        setIsConnecting(false);
    }, []);

    const disconnect = useCallback(() => {
        setActiveAccount(null);
        setPrivateKey(null);
        localStorage.removeItem('local_wallet_mnemonic');
    }, []);

    const signer = useCallback(
        (txnGroup, indexesToSign) => {
            if (!privateKey) throw new Error("Wallet not connected");
            const s = algosdk.makeBasicAccountTransactionSigner(privateKey);
            return s(txnGroup, indexesToSign);
        },
        [privateKey]
    );

    return {
        activeAccount,
        isConnecting,
        connect,
        disconnect,
        signer,
        isConnected: !!activeAccount,
    };
}
