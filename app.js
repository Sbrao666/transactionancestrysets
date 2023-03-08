const axios = require('axios');

const apiUrl = 'https://blockstream.info/api';
const blockHeight = 680000;

const transactionInfoCache = {}

async function getBlockHash() {
    try {
        const response = await axios.get(`${apiUrl}/block-height/${blockHeight}`);
        return response.data;
    } catch (err) {
        console.error(`Failed to fetch block: ${err}`);
        process.exit(1);
    }
}

async function getAllTransactionForBlock(hash) {
    try {
        const response = await axios.get(`${apiUrl}/block/${hash}/txids`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch transactions: ${error}`);
        process.exit(1);
    }
}

async function getTransactionInfo(txId) {
    if (txId === undefined) return 0;
    if (transactionInfoCache[txId] !== undefined) return transactionInfoCache[txId]
    try {
        const transactionInfo = await axios.get(`${apiUrl}/tx/${txId}`);
        const data = transactionInfo.data
        if (data.status.block_height === blockHeight) {
            let height = 1;
            const promises = data.vin.filter(tid => !tid.is_coinbase).map(tid => getTransactionInfo(tid.txId));
            const results = await Promise.all(promises);
            for (let result of results) {
                height += result + 1;
            }
            transactionInfoCache[txId] = height
            return height;
        } else {
            transactionInfoCache[txId] = 0
            return 0;
        }
    } catch (error) {
        console.log(txId)
        console.error(`Failed to fetch transactions: ${error}`);
        return 0;
    }
}

async function main() {
    try {
        const blockhash = await getBlockHash()
        const transactionIds = await getAllTransactionForBlock(blockhash)
        console.log(transactionIds.length)
        const promises = transactionIds.map(txId => {
            return getTransactionInfo(txId).then(data => ({
                transactionIds: txId,
                setCount: data
            }));
        });
        const set = await Promise.all(promises);
        set.sort((a, b) => b.setCount - a.setCount)
        console.log(set.slice(0, 10))
    } catch (error) {
        console.log(error)
    }
}

main();
