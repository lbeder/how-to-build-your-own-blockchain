import axios from "axios";

main();

async function main() {
    // Create wallets for Alice, Bob and Walter
    const aliceWallet = await createWallet();
    const bobWallet = await createWallet();
    const walterWallet = await createWallet();

    console.log('Alice mined a block in order to get a reward.');
    await mine(aliceWallet.address);
    await printBalances(aliceWallet.address, bobWallet.address, walterWallet.address);

    console.log('Alice sent 5 coins to Bob and 5 coin to Walter. Walter mined a block.');
    await transaction(aliceWallet, bobWallet.address, 5);
    await transaction(aliceWallet, walterWallet.address, 5);
    await mine(walterWallet.address);
    await printBalances(aliceWallet.address, bobWallet.address, walterWallet.address);

    console.log('Walter sent 5 coins to Bob and Bob sent 8 coins to Walter. Walter mined a block.');
    await transaction(walterWallet, bobWallet.address, 5);
    await transaction(bobWallet, walterWallet.address, 8);
    await mine(walterWallet.address);
    await printBalances(aliceWallet.address, bobWallet.address, walterWallet.address);
}

async function createWallet() {
    return JSON.parse((await axios.post('http://localhost:3000/wallet')).data);
}

function mine(minerAddress: string) {
    return axios.post('http://localhost:3000/blocks/mine', { minerAddress });
}

async function balance(walletAddress: string) {
    return (await axios.get(`http://localhost:3000/balance/${walletAddress}`)).data;
}

function transaction(senderWallet: Object, recipientAddress: string, value: number) {
    return axios.post('http://localhost:3000/transactions', { senderWallet, recipientAddress, value });
}

async function printBalances(aliceAddress: string, bobAddress: string, walterAddress: string) {
    const aliceBalance = await balance(aliceAddress);
    const bobBalance = await balance(bobAddress);
    const walterBalance = await balance(walterAddress);
    console.log(`\nBalance\n-------\nAlice:\t${aliceBalance} coins\nBob:\t${bobBalance} coins\nWalter:\t${walterBalance} coins\n\n\n`);
}
