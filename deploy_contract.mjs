import algosdk from 'algosdk';
import { readFileSync } from 'fs';

const ALGOD_SERVER = 'http://127.0.0.1';
const ALGOD_PORT = 4001;
const ALGOD_TOKEN = 'a'.repeat(64);

const algod = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

// Load the ARC56 JSON (produced by puya compiler) which contains the exact bytecode
const arc56 = JSON.parse(readFileSync(
    './credential-verifier/frontend/src/lib/CredentialVerifier.arc56.json',
    'utf8'
));

const approvalB64 = arc56.byteCode.approval;
const clearB64 = arc56.byteCode.clear;

const approval = new Uint8Array(Buffer.from(approvalB64, 'base64'));
const clear = new Uint8Array(Buffer.from(clearB64, 'base64'));

// Use sandbox KMD to get a funded account
const kmd = new algosdk.Kmd(ALGOD_TOKEN, 'http://127.0.0.1', 7833);

async function getFundedAccount() {
    const wallets = await kmd.listWallets();
    const wallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');
    const { wallet_handle_token } = await kmd.initWalletHandle(wallet.id, '');
    const { addresses } = await kmd.listKeys(wallet_handle_token);

    // Pick the account with the most ALGO
    let best = null, bestBal = -1n;
    for (const addr of addresses) {
        const info = await algod.accountInformation(addr).do();
        if (info.amount > bestBal) { bestBal = info.amount; best = addr; }
    }

    return { address: best, handle: wallet_handle_token, kmd };
}

async function main() {
    const { address, handle } = await getFundedAccount();
    console.log(`Deploying with account: ${address}`);

    const sp = await algod.getTransactionParams().do();

    const txn = algosdk.makeApplicationCreateTxnFromObject({
        sender: address,
        suggestedParams: sp,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: approval,
        clearProgram: clear,
        numGlobalInts: 0,
        numGlobalByteSlices: 1,  // admin key
        numLocalInts: 0,
        numLocalByteSlices: 0,
        extraPages: 0,
    });

    const { blob } = await kmd.signTransaction(handle, '', txn);
    const { txId } = await algod.sendRawTransaction(blob).do();
    const result = await algosdk.waitForConfirmation(algod, txId, 4);

    const appId = result['application-index'];
    console.log(`\n✅ CredentialVerifier deployed!`);
    console.log(`   App ID : ${appId}`);
    console.log(`   Tx ID  : ${txId}`);
    console.log(`\n👉 Update frontend/.env:`);
    console.log(`   VITE_APP_ID=${appId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
