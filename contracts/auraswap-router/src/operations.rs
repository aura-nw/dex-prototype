use cosmwasm_std::{
    to_binary, Addr, Coin, CosmosMsg, Decimal, Deps, DepsMut, Env, MessageInfo, Response, StdError,
    StdResult, WasmMsg,
};

use crate::state::{Config, CONFIG};

use cw20::Cw20ExecuteMsg;
use auraswap::asset::{Asset, AssetInfo, PairInfo};
use auraswap::pair::ExecuteMsg as PairExecuteMsg;
use auraswap::querier::{query_balance, query_pair_info, query_token_balance};
use auraswap::router::SwapOperation;

/// Execute swap operation
/// swap all offer asset to ask asset
/// This function is only called by this contract
/// @param operation <SwapOperation>: the pair to swap
/// @param to <Option<String>>: the receiver of ask asset
pub fn execute_swap_operation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    operation: SwapOperation,
    to: Option<String>,
) -> StdResult<Response> {
    // if the caller is not this contract, return error
    if env.contract.address != info.sender {
        return Err(StdError::generic_err("unauthorized"));
    }

    let messages: Vec<CosmosMsg> = match operation {
        // asset_info is the address of asset if asset is token OR is the denom is asset is native token
        SwapOperation::AuraSwap {
            offer_asset_info,
            ask_asset_info,
        } => {
            // load config of auraswap factory
            let config: Config = CONFIG.load(deps.as_ref().storage)?;

            // check the address of auraswap factory
            let auraswap_factory = deps.api.addr_humanize(&config.auraswap_factory)?;

            // query the information of pair that user want to swap from auraswap factory:
            // asset_infos: two assets of pair
            // contract_addr: the address of pair contract
            // liquidity_token: the address of liquidity token corresponding to pair
            // asset_decimals: the decimal of two assets
            let pair_info: PairInfo = query_pair_info(
                &deps.querier,
                auraswap_factory,
                &[offer_asset_info.clone(), ask_asset_info],
            )?;

            // query the balance amount of offer pool
            let amount = match offer_asset_info.clone() {
                AssetInfo::NativeToken { denom } => {
                    query_balance(&deps.querier, env.contract.address, denom)?
                }
                AssetInfo::Token { contract_addr } => query_token_balance(
                    &deps.querier,
                    deps.api.addr_validate(contract_addr.as_str())?,
                    env.contract.address,
                )?,
            };
            let offer_asset: Asset = Asset {
                info: offer_asset_info,
                amount,
            };

            vec![asset_into_swap_msg(
                deps.as_ref(),
                Addr::unchecked(pair_info.contract_addr),
                offer_asset,
                None,
                to,
            )?]
        }
    };

    Ok(Response::new().add_messages(messages))
}

pub fn asset_into_swap_msg(
    _deps: Deps,
    pair_contract: Addr,
    offer_asset: Asset,
    max_spread: Option<Decimal>,
    to: Option<String>,
) -> StdResult<CosmosMsg> {
    match offer_asset.info.clone() {
        AssetInfo::NativeToken { denom } => Ok(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: pair_contract.to_string(),
            funds: vec![Coin {
                denom,
                amount: offer_asset.amount,
            }],
            msg: to_binary(&PairExecuteMsg::Swap {
                offer_asset,
                belief_price: None,
                max_spread,
                to,
            })?,
        })),
        AssetInfo::Token { contract_addr } => Ok(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr,
            funds: vec![],
            msg: to_binary(&Cw20ExecuteMsg::Send {
                contract: pair_contract.to_string(),
                amount: offer_asset.amount,
                msg: to_binary(&PairExecuteMsg::Swap {
                    offer_asset,
                    belief_price: None,
                    max_spread,
                    to,
                })?,
            })?,
        })),
    }
}
