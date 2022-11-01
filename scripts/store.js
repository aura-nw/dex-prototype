const chainConfig = require('./config/chain').defaultChain;

const fs = require('fs');

const { SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { calculateFee, GasPrice } = require('@cosmjs/stargate');

async function instantiate(_codeID, _name) {
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
    const instantiateMsg = {"name":"AURA ACCOUNT BOUND",
                            "symbol":"AAB",
                            "minter":account.address,};


    //Instantiate the contract
    const instantiateResponse = await client.instantiate(account.address, Number(_codeID), instantiateMsg, "Instantiate contract", defaultFee);
    console.log(instantiateResponse);

    // print out the address of the newly created contract
    const contracts = await client.getContracts(_codeID);
    console.log(contracts);
}

async function store(myArgs) {
    // Deletes ALL existing entries
    if (process.env.DB_RESET || process.env.NODE_ENV === 'test') {
        await knex('standard_contracts').del();
    }

    const deployerWallet = await DirectSecp256k1HdWallet.fromMnemonic(
        chainConfig.deployer_mnemonic,
        {
            prefix: chainConfig.prefix
        }
    );

    const client = await SigningCosmWasmClient.connectWithSigner(chainConfig.rpcEndpoint, deployerWallet);
    const gasPrice = GasPrice.fromString(`0.025${chainConfig.denom}`);
    const uploadFee = calculateFee(2500000, gasPrice);
    const account = (await deployerWallet.getAccounts())[0];

    for (element of myArgs) {
        // get uri of wasm code of 'element' contract
        const wasm = fs.readFileSync(`${__dirname}/../target/wasm32-unknown-unknown/release/${element}.wasm`);
        // store code of 'element' contract using uri of wasm code
        const uploadResponse = await client.upload(account.address, wasm, uploadFee, `Upload ${element} contract code`);
        // show code id of 'element' contract
        console.log(`codeID of ${element} contract: ${uploadResponse.codeId}`);
        // instantiate 'element' contract using code id
        // instantiate(codeId, element);
    }
}

const myArgs = process.argv.slice(2);
store(myArgs)