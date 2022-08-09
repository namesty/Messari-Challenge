import Big from "big.js";
import { Pool, SubgraphPool } from "./types";

export const subgraphPoolsToPools = (pools: SubgraphPool[], blockNumber: number): Pool[] => {
  return pools.map(({ id, feesUSD, totalValueLockedUSD }) => ({
    id,
    cumulativeFeesUSD: new Big(feesUSD),
    totalValueLockedUSD: new Big(totalValueLockedUSD),
    blockNumber
  }));
}