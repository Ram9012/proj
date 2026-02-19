import algosdk from './node_modules/algosdk/dist/esm/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const ALGOD_TOKEN = 'a'.repeat(64);
const algod = new algosdk.Algodv2(ALGOD_TOKEN, 'http://127.0.0.1', 4001);
const kmd = new algosdk.Kmd(ALGOD_TOKEN, 'http://127.0.0.1', 4002);

const arc56 = JSON.parse(readFileSync('./src/lib/CredentialVerifier.arc56.json', 'utf8'));
const approval = new Uint8Array(Buffer.from(arc56.byteCode.approval, 'base64'));
const clear = new Uint8Array(Buffer.from(arc56.byteCode.clear, 'base64'));

async function getFundedAccount() {
    const wallets = await kmd.listWallets();
    const wallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');
    const { wallet_handle_token: handle } = await kmd.initWalletHandle(wallet.id, '');
    const { addresses } = await kmd.listKeys(handle);

    let best = null, bestBal = -1n;
    for (const addr of addresses) {
        const info = await algod.accountInformation(addr).do();
        const bal = BigInt(info.amount);
        if (bal > bestBal) { bestBal = bal; best = addr; }
    }
    return { address: best, handle };
}

async function main() {
    const { address, handle } = await getFundedAccount();
    console.log(`Deploying CredentialVerifier with account: ${address}`);

    const sp = await algod.getTransactionParams().do();

    const txn = algosdk.makeApplicationCreateTxnFromObject({
        sender: address,
        suggestedParams: sp,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: approval,
        clearProgram: clear,
        numGlobalInts: 0,
        numGlobalByteSlices: 1,
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

    // Patch .env in place
    const envPath = './.env';
    let env = readFileSync(envPath, 'utf8');
    env = env.replace(/VITE_APP_ID=\d+/, `VITE_APP_ID=${appId}`);
    writeFileSync(envPath, env);
    console.log(`\n✅ .env updated: VITE_APP_ID=${appId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
