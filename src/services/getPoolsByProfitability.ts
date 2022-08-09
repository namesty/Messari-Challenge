import Big from "big.js";
import { cachePools, getCachedPools } from "../db/cache";
import { fetchBlockNearestToTimestamp } from "../subgraph/ethereum-blocks/fetchBlockNearestToTimestamp";
import { fetchPoolsByBlock } from "../subgraph/uniswap/fetchPoolsByBlock";
import { subgraphPoolsToPools } from "../subgraph/uniswap/subgraphPoolsToPools";
import {
  FormattedPool,
  Pool,
  PoolWithEarnings,
  SubgraphPool,
} from "../subgraph/uniswap/types";
import { chunkArrayInGroups } from "../utils/chunkArrayInGroups";
import { makeIntArray } from "../utils/makeIntArray";

const emptyPoolWithEarnings: PoolWithEarnings = {
  id: "",
  totalEarningsUSD: Big(0),
  blockNumber: 0,
  dayData: {},
};

export const getPoolsByProfitability = async (
  numberOfDaysAgo: number,
  noCache: boolean = false
): Promise<FormattedPool[]> => {
  const poolsPerDaysAgo: Record<number, Record<string, Pool>> = {};

  // Fetch an additional day's pools, to get non-cumulatives from furthest day back and +1 because today counts as day 0
  const daysAgoToFetch = makeIntArray(numberOfDaysAgo + 2);

  // Limit parallel fetching to 10 days at a time
  const batchesOfDays = chunkArrayInGroups(daysAgoToFetch, 10);

  for await (let daysBatch of batchesOfDays) {
    await Promise.all(daysBatch.map(async (daysAgo) => {
      let subgraphPoolsDataInBlock: SubgraphPool[];

      const daysInUnixSeconds = daysAgo * 86400;
      const nowInUnixSeconds = Math.floor(Date.now() / 1000);
      const timestamp = nowInUnixSeconds - daysInUnixSeconds;
      const blockNumber = await fetchBlockNearestToTimestamp(timestamp);
      const hourTimestamp = Math.floor(timestamp / 3600);

      if (noCache) {
        subgraphPoolsDataInBlock = await fetchPoolsByBlock(blockNumber);
      } else {
        // Get cached pools from DB from current hour
        const cachedPools = await getCachedPools(hourTimestamp);
  
        if (cachedPools) {
          subgraphPoolsDataInBlock = cachedPools.pools;
        } else {
          subgraphPoolsDataInBlock = await fetchPoolsByBlock(blockNumber);
          cachePools(subgraphPoolsDataInBlock, hourTimestamp);
        }
      }

      const pools = subgraphPoolsToPools(subgraphPoolsDataInBlock, blockNumber);

      poolsPerDaysAgo[daysAgo] = Object.fromEntries(
        pools.map((p) => [p.id, p])
      );
    }))
  }

  const earningsPerPool: Record<string, PoolWithEarnings> = {};

  makeIntArray(numberOfDaysAgo + 1).forEach((daysAgo) => {
    const poolMapCurrentDay = poolsPerDaysAgo[daysAgo];
    const poolMapDayBefore = poolsPerDaysAgo[daysAgo + 1];

    Object.values(poolMapCurrentDay).forEach((poolCurrentDay) => {
      const poolDayBefore = poolMapDayBefore[poolCurrentDay.id];
      // Current day's fees = current day's cumulative fees - day before's cumulative fees
      const currentDayFeesInUSD = poolDayBefore
        ? Big(poolCurrentDay.cumulativeFeesUSD).sub(
            poolDayBefore.cumulativeFeesUSD
          )
        : Big(poolCurrentDay.cumulativeFeesUSD);

      const percentageOfTVL = Big(100)
        .div(poolCurrentDay.totalValueLockedUSD)
        .div(100);

      // Earnings = current day's fees * percentage of TVL
      const earningsPerDollar = percentageOfTVL.mul(currentDayFeesInUSD);

      if (!earningsPerPool[poolCurrentDay.id]) {
        // If empty, initialize with empty pool with earnings
        earningsPerPool[poolCurrentDay.id] = emptyPoolWithEarnings;
      }

      earningsPerPool[poolCurrentDay.id] = {
        id: poolCurrentDay.id,
        blockNumber: poolCurrentDay.blockNumber,
        totalEarningsUSD: earningsPerDollar,
        dayData: {
          ...earningsPerPool[poolCurrentDay.id].dayData,
          [daysAgo]: {
            earningsPerDollar,
            totalValueLockedUSD: poolCurrentDay.totalValueLockedUSD,
            feesUSD: currentDayFeesInUSD,
            percentageOfPoolPerDollar: percentageOfTVL,
          },
        },
      };
    });
  });

  return Object.values(earningsPerPool)
    .sort((poolWithEarningsA, poolWithEarningsB) =>
      poolWithEarningsA.totalEarningsUSD.gt(poolWithEarningsB.totalEarningsUSD)
        ? -1
        : 0
    )
    .map((poolWithEarnings) => ({
      ...poolWithEarnings,
      totalEarningsUSD: poolWithEarnings.totalEarningsUSD.toString(),
      dayData: Object.fromEntries(
        Object.entries(poolWithEarnings.dayData).map(([daysAgo, earnings]) => [
          `${Number(daysAgo) + 1} days ago`,
          JSON.stringify(
            {
              earningsPerDollar: earnings.earningsPerDollar.toString(),
              totalValueLockedUSD: earnings.totalValueLockedUSD.toString(),
              feesUSD: earnings.feesUSD.toString(),
              percentageOfPoolPerDollar:
                earnings.percentageOfPoolPerDollar.toString(),
            },
            null,
            2
          ),
        ])
      ),
    }));
};
