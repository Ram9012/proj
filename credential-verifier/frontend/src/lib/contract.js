
import algosdk from 'algosdk';
import { algodClient, APP_ID } from './algorand';

// algosdk v3: use ABIMethod.fromSignature() to get properly-typed method objects.
// Signatures must exactly match what the deployed contract was compiled with —
// verified from CredentialVerifier.arc56.json.
const METHODS = {
    issue: algosdk.ABIMethod.fromSignature('issue_credential(address,string,string,string)uint64'),
    transfer: algosdk.ABIMethod.fromSignature('transfer_to_student(uint64,address)void'),
    revoke: algosdk.ABIMethod.fromSignature('revoke_credential(uint64,address)void'),
    info: algosdk.ABIMethod.fromSignature('get_issuer_info()address'),
};

/** algosdk v3 returns Address objects; ATC sender must be a plain string. */
const str = (addr) => (addr ? addr.toString() : addr);

/** Helper to encode Box Key: "rev_" + uint64(assetId) */
function getBoxKey(assetId) {
    const prefix = new Uint8Array([114, 101, 118, 95]); // "rev_"
    const id = BigInt(assetId);
    const idBytes = algosdk.encodeUint64(id);
    const boxName = new Uint8Array(prefix.length + idBytes.length);
    boxName.set(prefix);
    boxName.set(idBytes, prefix.length);
    return boxName;
}

export async function issueCredential(sender, signer, { studentAddress, assetName, unitName, ipfsUrl }) {
    const sp = await algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 2000n; // outer + inner asset-create

    // 1. Simulate to find the resulting Asset ID (needed for Box Key)
    const simAtc = new algosdk.AtomicTransactionComposer();
    simAtc.addMethodCall({
        appID: APP_ID,
        method: METHODS.issue,
        methodArgs: [studentAddress, assetName, unitName, ipfsUrl],
        sender: str(sender),
        signer,
        suggestedParams: sp,
    });

    // Simulate with allowUnnamedResources to let it access the box without ref
    const simResult = await simAtc.simulate(algodClient, new algosdk.modelsv2.SimulateRequest({
        txnGroups: [], allowUnnamedResources: true, allowEmptySignatures: true
    }));

    if (simResult.failureMessage) {
        throw new Error("Simulation failed: " + simResult.failureMessage);
    }

    // Parse Asset ID from return value
    const newAssetId = simResult.methodResults[0].returnValue;
    const boxName = getBoxKey(newAssetId);

    // 2. Build Real Transaction with Box Reference
    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.issue,
        methodArgs: [studentAddress, assetName, unitName, ipfsUrl],
        sender: str(sender),
        signer,
        suggestedParams: sp,
        boxes: [{ appIndex: 0, name: boxName }]
    });

    const result = await atc.execute(algodClient, 4);
    return {
        txId: result.txIDs[0],
        assetId: result.methodResults[0].returnValue,
    };
}

export async function transferToStudent(sender, signer, { assetId, studentAddress }) {
    const sp = await algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 2000n; // outer + inner asset-transfer

    console.log(`Transferring Asset ${assetId} to ${studentAddress}`);

    // Debug: Ensure assetId is a number for foreignAssets
    const foreignAssets = [Number(assetId)];
    console.log("Foreign Assets:", foreignAssets);

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.transfer,
        methodArgs: [BigInt(assetId), studentAddress],
        sender: str(sender),
        signer,
        suggestedParams: sp,
        boxes: [{ appIndex: 0, name: getBoxKey(assetId) }],
        foreignAssets: foreignAssets,
        appForeignAssets: foreignAssets, // Try alternate name for SDK compatibility
    });

    const result = await atc.execute(algodClient, 4);
    return { txId: result.txIDs[0] };
}

export async function revokeCredential(sender, signer, { assetId, studentAddress }) {
    const sp = await algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 3000n; // outer + freeze + clawback-transfer

    console.log(`Revoking Asset ${assetId} from ${studentAddress}`);
    const foreignAssets = [Number(assetId)];

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.revoke,
        methodArgs: [BigInt(assetId), studentAddress],
        sender: str(sender),
        signer,
        suggestedParams: sp,
        boxes: [{ appIndex: 0, name: getBoxKey(assetId) }],
        foreignAssets: foreignAssets,
        appForeignAssets: foreignAssets,
    });

    const result = await atc.execute(algodClient, 4);
    return { txId: result.txIDs[0] };
}

export async function getIssuerInfo() {
    const sp = await algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 1000n;

    const dummy = algosdk.generateAccount();
    const dummySigner = algosdk.makeBasicAccountTransactionSigner(dummy);

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.info,
        methodArgs: [],
        sender: dummy.addr.toString(),
        signer: dummySigner,
        suggestedParams: sp,
    });

    const { methodResults } = await atc.simulate(algodClient, new algosdk.modelsv2.SimulateRequest({
        txnGroups: [], allowUnnamedResources: true,
    }));
    return methodResults[0].returnValue;
}

export async function optInToAsset(sender, signer, assetId) {
    const sp = await algodClient.getTransactionParams().do();
    const senderStr = str(sender);

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: senderStr,
        to: senderStr,
        assetIndex: Number(assetId),
        amount: 0,
        suggestedParams: sp,
    });

    const signedTxns = await signer([{ txn, signers: [senderStr] }], [0]);
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);
    return { txId };
}
