
import algosdk from 'algosdk';

export const APP_ID = parseInt(import.meta.env.VITE_APP_ID || 0);

// AlgoKit LocalNet defaults — override via .env (VITE_ALGOD_SERVER, VITE_ALGOD_TOKEN, etc.)
// Port must be passed as the 3rd arg to Algodv2/Indexer; the server must NOT include the port.
function parseServerUrl(fullUrl) {
    try {
        const u = new URL(fullUrl);
        return { server: `${u.protocol}//${u.hostname}`, port: u.port || '' };
    } catch {
        return { server: fullUrl, port: '' };
    }
}

const ALGOD_FULL = import.meta.env.VITE_ALGOD_SERVER || 'http://127.0.0.1:4001';
const INDEXER_FULL = import.meta.env.VITE_INDEXER_SERVER || 'http://127.0.0.1:8980';
// LocalNet uses this fixed dummy token; a real node may use '' or a real token
const ALGOD_TOKEN = import.meta.env.VITE_ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const INDEXER_TOKEN = import.meta.env.VITE_INDEXER_TOKEN || '';

const algod = parseServerUrl(ALGOD_FULL);
const indexer = parseServerUrl(INDEXER_FULL);

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, algod.server, algod.port);
export const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, indexer.server, indexer.port);

export function getExplorerUrl(type, id) {
    if (type === 'tx') return `https://lora.algokit.io/localnet/transaction/${id}`;
    if (type === 'asset') return `https://lora.algokit.io/localnet/asset/${id}`;
    if (type === 'app') return `https://lora.algokit.io/localnet/application/${id}`;
    return '#';
}

export async function getAccountAssets(address) {
    try {
        const response = await indexerClient.lookupAccountAssets(address).do();
        return response.assets || [];
    } catch (e) {
        console.error('Error fetching account assets', e);
        return [];
    }
}

export async function getAssetInfo(assetId) {
    try {
        const response = await indexerClient.lookupAssetByID(assetId).do();
        return response.asset;
    } catch (e) {
        console.error('Error fetching asset info', e);
        return null;
    }
}
