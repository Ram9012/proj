
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

export async function issueCredential(sender, signer, { studentAddress, assetName, unitName, ipfsUrl }) {
    const sp = await algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 2000n; // outer + inner asset-create

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.issue,
        methodArgs: [studentAddress, assetName, unitName, ipfsUrl],
        sender: str(sender),
        signer,
        suggestedParams: sp,
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

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.transfer,
        methodArgs: [BigInt(assetId), studentAddress],
        sender: str(sender),
        signer,
        suggestedParams: sp,
    });

    const result = await atc.execute(algodClient, 4);
    return { txId: result.txIDs[0] };
}

export async function revokeCredential(sender, signer, { assetId, studentAddress }) {
    const sp = await algodClient.getTransactionParams().do();
    sp.flatFee = true;
    sp.fee = 3000n; // outer + freeze + clawback-transfer

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
        appID: APP_ID,
        method: METHODS.revoke,
        methodArgs: [BigInt(assetId), studentAddress],
        sender: str(sender),
        signer,
        suggestedParams: sp,
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
