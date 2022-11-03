const chainConfig = require('./config/chain').defaultChain;

const fs = require('fs');

const { SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
// const { calculateFee, GasPrice } = require('@cosmjs/stargate');

const allContractNameCode = {   auraswap_token: 1,
                                auraswap_pair: 2,
                                auraswap_factory: 3,
                                auraswap_router: 4,
                        };  

function getInstantiationMsg(_contractName, _contractArgvs) {
    let codeName = allContractNameCode[_contractName];
    switch(codeName) {
        case 1:
            // auraswap_token (LP token)
            // auraswap_token's instantiation message need theses parameters:
            // name<String>: "auraswap liquidity token"
            // symbol<String>: "uLP"
            // decimals<uint8>: 6
            // initial_balances: vec![]
            // mint: {minter:"address", cap:None}

            // create the instantiation message for auraswap_token
            let auraswap_token_instantiateMsg = {
                name:"liquidity token",
                symbol:"uLP",
                decimals:6,
                initial_balances:[ {address:"aura1uh24g2lc8hvvkaaf7awz25lrh5fptthu2dhq0n", amount:"100000000"} ],
                mint: {
                    minter:"aura1uh24g2lc8hvvkaaf7awz25lrh5fptthu2dhq0n",
                    cap:"100000000"
                }
            };

            // return the instantiation message
            return auraswap_token_instantiateMsg;
        case 2:
            // auraswap_pair
            // auraswap_pair's instantiation message need theses parameters:
            // asset_infos: [AssetInfo1, AssetInfo2]
            // token_code_id: 1
            // asset_decimals: [6, 6]

            // create the instantiation message for auraswap_pair
            let auraswap_pair_instantiateMsg = {
                InstantiateMsg: {
                    asset_infos: [
                        {NativeToken: {
                            denom: "uusd",
                        }},
                        {Token: {
                            contract_addr: "asset0000",
                        }},
                    ],
                    token_code_id: 10,
                    asset_decimals: [6, 8],
                }
            };

            // return the instantiation message
            return auraswap_pair_instantiateMsg;
        case 3:
            // auraswap_factory
            // auraswap_factory's instantiation message need theses parameters:
            // pair_code_id: 1
            // token_code_id: 1

            // create the instantiation message for auraswap_factory
            let auraswap_factory_instantiateMsg = {
                InstantiateMsg: {
                    pair_code_id: 1,
                    token_code_id: 1,
                }
            };

            // return the instantiation message
            return auraswap_factory_instantiateMsg;
        case 4:
            // auraswap_router
            // auraswap_router's instantiation message need theses parameters:
            // auraswap_factory: "Addr"

            // create the instantiation message for auraswap_router
            let auraswap_router_instantiateMsg = {
                InstantiateMsg: {
                    auraswap_factory: "Addr",
                }
            };

            // return the instantiation message
            return auraswap_router_instantiateMsg;
        default:
            // return the error message
            return "Error: No such contract name";
    }
}

async function instantiate(_contractName) {
    const deployerWallet = await DirectSecp256k1HdWallet.fromMnemonic(
        chainConfig.deployer_mnemonic,
        {
            prefix: chainConfig.prefix
        }
    );
    const client = await SigningCosmWasmClient.connectWithSigner(chainConfig.rpcEndpoint, deployerWallet);

    const account = (await deployerWallet.getAccounts())[0];

    const defaultFee = { amount: [{amount: "200000", denom: chainConfig.denom,},], gas: "200000",};

    // load code id of contract contract from contractCodeIDs.json
    let rawdata = fs.readFileSync('./scripts/contractCodeIDs.json');

    // create a contractCode empty object
    let contractCodes = {};
    // if rawdata is not empty, then assgin contractCodes to rawdata after parsing it
    if (rawdata.length > 0) {
        contractCodes = JSON.parse(rawdata);
    }

    // if the contractCodes contains the contractName key
    if (contractCodes.hasOwnProperty(_contractName)) {
        // then get the code id of the contract
        const codeId = contractCodes[_contractName];

        // get instantiation message of the contract from contractName
        const instantiateMsg = getInstantiationMsg(_contractName, []);

        // print the instantiation message
        console.log("Instantiation message: ", instantiateMsg);

        // instantiate the contract
        const instantiateResponse = await client.instantiate(account.address, Number(codeId), instantiateMsg, `Instantiate ${_contractName}`, defaultFee);
        
        // // store the contract address to contractAddress.json
        // let rawdata = fs.readFileSync('./scripts/contractAddress.json');

        // print the contract address
        console.log(instantiateResponse.contractAddress);

    } else {
        // if the contractCodes does not contain the contractName key, then return the error message
        return "Error: Contract code id not found";
    }
}

const myArgs = process.argv.slice(2);
instantiate(myArgs[0]);
