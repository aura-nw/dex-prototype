use cw_storage_plus::Item;
use auraswap::asset::PairInfoRaw;

pub const PAIR_INFO: Item<PairInfoRaw> = Item::new("pair_info");
