const chainConfig = require('./config/chain').defaultChain;

const fs = require('fs');

const { SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
// const { calculateFee, GasPrice } = require('@cosmjs/stargate');

async function instantiate(_codeID) {
    const deployerWallet = await DirectSecp256k1HdWallet.fromMnemonic(
        chainConfig.deployer_mnemonic,
        {
            prefix: chainConfig.prefix
        }
    );
    const client = await SigningCosmWasmClient.connectWithSigner(chainConfig.rpcEndpoint, deployerWallet);

    const account = (await deployerWallet.getAccounts())[0];

    const defaultFee = { amount: [{amount: "200000", denom: chainConfig.denom,},], gas: "200000",};

    const codeId = _codeID;
    //Define the instantiate message
    const instantiateMsg = {"auraswap_factory":"aura1g8xt7rxmq6h3tq7fd2atux99jurx7qc5w4aua2etjyck0y44mvhsssamyn",};


    //Instantiate the contract
    const instantiateResponse = await client.instantiate(account.address, Number(_codeID), instantiateMsg, "AuraSwap Router", defaultFee);
    console.log(instantiateResponse);

    // print out the address of the newly created contract
    const contracts = await client.getContracts(_codeID);
    console.log(contracts);
}

const myArgs = process.argv.slice(2);
instantiate(myArgs[0]);
