'use strict';
const fs = require('fs');

const chainConfig = require('./config/chain').defaultChain;

const { SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { calculateFee, GasPrice } = require('@cosmjs/stargate');

const allContracts = [  "auraswap_token", 
                        "auraswap_pair",
                        "auraswap_factory",
                        "auraswap_router",
                    ];                 

async function store(_contractName) {
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

    if (_contractName === "all") {
        var contractCodeIDs = {};
        for (var element of allContracts) {
            // get uri of wasm code of 'element' contract
            const wasm = fs.readFileSync(`${__dirname}/../target/wasm32-unknown-unknown/release/${element}.wasm`);

            // store code of 'element' contract using uri of wasm code
            const uploadResponse = await client.upload(account.address, wasm, uploadFee, `Upload ${element} contract code`);
            
            // store code id of 'element' contract
            contractCodeIDs[element] = uploadResponse.codeId;

            // print code id of 'element' contract
            console.log(`Code ID of ${element} contract: ${uploadResponse.codeId}`);
        }

        let contractCodeIDsStr = JSON.stringify(contractCodeIDs);
        fs.writeFileSync('./scripts/contractCodeIDs.json', contractCodeIDsStr);
    }
    else {
        // check if _contractName is an element of allContracts
        if (allContracts.includes(_contractName)) {
            // load code id of 'element' contract from contractCodeIDs.json
            let rawdata = fs.readFileSync('./scripts/contractCodeIDs.json');

            // create a contractCode empty object
            let contractCodes = {};
            // if rawdata is not empty, then assgin contractCodes to rawdata after parsing it
            if (rawdata.length > 0) {
                contractCodes = JSON.parse(rawdata);
            }

            // get uri of wasm code of _contractName contract
            const wasm = fs.readFileSync(`${__dirname}/../target/wasm32-unknown-unknown/release/${_contractName}.wasm`);

            // store code of _contractName contract using uri of wasm code
            const uploadResponse = await client.upload(account.address, wasm, uploadFee, `Upload ${_contractName} contract code`);

            // store code id of _contractName contract
            contractCodes[_contractName] = uploadResponse.codeId;

            // print code id of _contractName contract
            console.log(`Code ID of ${_contractName} contract: ${uploadResponse.codeId}`);

            // update contractCodeIDs.json
            let contractCodeIDsStr = JSON.stringify(contractCodes);

            // write contractCodeIDs.json
            fs.writeFileSync('./scripts/contractCodeIDs.json', contractCodeIDsStr);
        }
        else {
            console.log("Invalid contract name");
        }
    }
}

const myArgs = process.argv.slice(2);
store(myArgs[0]);