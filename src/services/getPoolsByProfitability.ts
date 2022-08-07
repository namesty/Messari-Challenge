import Big from "big.js";
import { fetchBlockNearestToTimestamp } from "../subgraph/ethereum-blocks/fetchBlockNearestToTimestamp";
import { fetchPoolsByBlock } from "../subgraph/uniswap/fetchPoolsByBlock";
import { subgraphPoolsToPools } from "../subgraph/uniswap/subgraphPoolsToPools";
import { FormattedPool, Pool, PoolWithEarnings } from "../subgraph/uniswap/types";

export const getPoolsByProfitability = async (
  numberOfDaysAgo: number
): Promise<FormattedPool[]> => {
  const poolsPerDay: Record<number, Record<string, Pool>> = {};

  // Fetch an additional day's pools, to get non-cumulatives from furthest day back
  await Promise.all([...Array(numberOfDaysAgo + 1).keys()].map(async (daysAgo) => {
    const daysInUnixSeconds = daysAgo * 86400
    const nowInUnixSeconds = Math.floor(Date.now() / 1000)
    const timestamp = nowInUnixSeconds - daysInUnixSeconds;
    const blockNumber = await fetchBlockNearestToTimestamp(timestamp);
    const subgraphPoolsDataInBlock = await fetchPoolsByBlock(
      blockNumber
    );
    const pools = subgraphPoolsToPools(subgraphPoolsDataInBlock);

    poolsPerDay[daysAgo] = Object.fromEntries(pools.map((p) => [p.id, p]));
  }))

  const earningsPerPool: Record<string, PoolWithEarnings> = {};

  [...Array(numberOfDaysAgo).keys()].forEach((daysAgo) => {
    const poolMapCurrentDay = poolsPerDay[daysAgo];
    const poolMapDayBefore = poolsPerDay[daysAgo + 1];

    Object.values(poolMapCurrentDay).forEach((poolCurrentDay) => {
      const poolDayBefore = poolMapDayBefore[poolCurrentDay.id];
      const currentDayFeesInUSD = poolDayBefore
        ? Big(poolCurrentDay.cumulativeFeesUSD).sub(
            poolDayBefore.cumulativeFeesUSD
          )
        : Big(poolCurrentDay.cumulativeFeesUSD);

      const percentageOfPoolPerDollar = poolCurrentDay.totalValueLockedUSD.eq(0)
        ? Big(0)
        : Big(100).div(poolCurrentDay.totalValueLockedUSD);

      const earningsPerDollar =
        percentageOfPoolPerDollar.mul(currentDayFeesInUSD);

      if (earningsPerPool[poolCurrentDay.id]) {
        earningsPerPool[poolCurrentDay.id].totalEarningsUSD =
          earningsPerPool[poolCurrentDay.id].totalEarningsUSD.add(
            earningsPerDollar
          );
        earningsPerPool[poolCurrentDay.id].earningsPerDay = {
          ...earningsPerPool[poolCurrentDay.id].earningsPerDay,
          [daysAgo]: earningsPerDollar,
        };
      } else {
        earningsPerPool[poolCurrentDay.id] = {
          id: poolCurrentDay.id,
          totalEarningsUSD: earningsPerDollar,
          totalValueLockedUSD: poolCurrentDay.totalValueLockedUSD,
          feesUSD: currentDayFeesInUSD,
          earningsPerDay: {
            [daysAgo]: earningsPerDollar,
          },
        };
      }
    });
  })

  return Object.values(earningsPerPool)
    .sort((poolWithEarningsA, poolWithEarningsB) =>
      poolWithEarningsA.totalEarningsUSD.gt(poolWithEarningsB.totalEarningsUSD)
        ? -1
        : 0
    )
    .map((poolWithEarnings) => ({
      ...poolWithEarnings,
      feesUSD: poolWithEarnings.feesUSD.toString(),
      totalValueLockedUSD: poolWithEarnings.totalValueLockedUSD.toString(),
      totalEarningsUSD: poolWithEarnings.totalEarningsUSD.toString(),
      earningsPerDay: Object.fromEntries(
        Object.entries(poolWithEarnings.earningsPerDay).map(
          ([daysAgo, earnings]) => [daysAgo, earnings.toString()]
        )
      ),
      apr: poolWithEarnings.totalValueLockedUSD.eq(0) ? "0" : poolWithEarnings.feesUSD
        .div(poolWithEarnings.totalValueLockedUSD)
        .mul(36500)
        .toString(),
    }));
};