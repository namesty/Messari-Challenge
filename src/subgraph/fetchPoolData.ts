import { GraphQLClient, request } from "graphql-request";
import Big from "big.js";
import { GET_POOLS_BY_BLOCK } from "./queries/GET_POOLS_BY_BLOCK";
import { GET_BLOCK_BY_TIMESTAMP } from "./queries/GET_BLOCK_BY_TIMESTAMP";

interface SubgraphPool {
  id: string;
  feesUSD: string;
  totalValueLockedUSD: string;
}

interface Pool {
  id: string;
  cumulativeFeesUSD: Big;
  totalValueLockedUSD: Big;
}

interface PoolWithEarnings {
  id: string;
  feesUSD: Big;
  totalValueLockedUSD: Big;
  totalEarningsUSD: Big;
  earningsPerDay: {
    [daysAgo: number]: Big;
  };
}

interface FormattedPool {
  id: string;
  feesUSD: string;
  totalValueLockedUSD: string;
  totalEarningsUSD: string;
  earningsPerDay: {
    [daysAgo: number]: string;
  };
  apr: string;
}

const SUBGRAPH_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph";
const ETHEREUM_BLOCKS_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks";
const UNIX_SECONDS_PER_DAY = 60 * 60 * 24;
const PAGE_SIZE = 1000;

const client = new GraphQLClient(SUBGRAPH_ENDPOINT, {});

const fetchSubgraphPoolsByBlock = async (
  blockNumber: number,
  lastID: string = ""
): Promise<SubgraphPool[]> => {
  const { pools: subgraphPools } = await client.request<{
    pools: SubgraphPool[];
  }>(GET_POOLS_BY_BLOCK, {
    lastID,
    block: blockNumber,
    pageSize: PAGE_SIZE,
  });

  const pools: SubgraphPool[] = ([] as SubgraphPool[]).concat(subgraphPools);

  if (subgraphPools.length === PAGE_SIZE) {
    const newLastID = subgraphPools[subgraphPools.length - 1].id;
    const nextFetchedPools = await fetchSubgraphPoolsByBlock(
      blockNumber,
      newLastID
    );
    pools.push(...nextFetchedPools);
  }

  return pools;
};

const fetchNearestBlockToTimestamp = async (
  timestamp: number
): Promise<number> => {
  const { blocks } = await request<{ blocks: { number: string }[] }>(
    ETHEREUM_BLOCKS_ENDPOINT,
    GET_BLOCK_BY_TIMESTAMP,
    {
      timestamp,
    }
  );

  return parseInt(blocks[0].number);
};

export const fetchPoolData = async (
  numberOfDaysAgo: number
): Promise<FormattedPool[]> => {
  const poolsPerDay: Record<number, Record<string, Pool>> = {};

  for (let i = 0; i <= numberOfDaysAgo; i++) {
    const timestamp = Math.floor(Date.now() / 1000) - i * UNIX_SECONDS_PER_DAY;
    // console.log("UNIX: ", timestamp.toString())
    const blockNumber = await fetchNearestBlockToTimestamp(timestamp);
    // console.log("BLOCK: ", blockNumber.toString())
    const subgraphPoolsDataInBlock = await fetchSubgraphPoolsByBlock(
      blockNumber
    );
    const pools: Pool[] = subgraphPoolsDataInBlock.map((subgraphPool) => ({
      id: subgraphPool.id,
      cumulativeFeesUSD: Big(subgraphPool.feesUSD),
      totalValueLockedUSD: Big(subgraphPool.totalValueLockedUSD),
    }));

    poolsPerDay[i] = Object.fromEntries(pools.map((p) => [p.id, p]));
  }

  const earningsPerPool: Record<string, PoolWithEarnings> = {};

  for (let i = 0; i < numberOfDaysAgo; i++) {
    const poolMapCurrentDay = poolsPerDay[i];
    const poolMapDayBefore = poolsPerDay[i + 1];

    Object.values(poolMapCurrentDay).forEach((poolCurrentDay) => {
      const poolDayBefore = poolMapDayBefore[poolCurrentDay.id];
      // console.log("TVL: ", totalValueLockedInUSD.toString())
      //TODO: make comment on fees calculation
      const currentDayFeesInUSD = poolDayBefore
        ? Big(poolCurrentDay.cumulativeFeesUSD).sub(
            poolDayBefore.cumulativeFeesUSD
          )
        : Big(poolCurrentDay.cumulativeFeesUSD);
      // console.log("FEES USD: ", feesInUSD.toString())
      const percentageOfPoolPerDollar = poolCurrentDay.totalValueLockedUSD.eq(0)
        ? Big(0)
        : Big(100).div(poolCurrentDay.totalValueLockedUSD);

      const earningsPerDollar =
        percentageOfPoolPerDollar.mul(currentDayFeesInUSD);
      // console.log("EARNINGS USD: ", earningsPerDollar.toString())

      if (earningsPerPool[poolCurrentDay.id]) {
        earningsPerPool[poolCurrentDay.id].totalEarningsUSD =
          earningsPerPool[poolCurrentDay.id].totalEarningsUSD.add(
            earningsPerDollar
          );
        earningsPerPool[poolCurrentDay.id].earningsPerDay = {
          ...earningsPerPool[poolCurrentDay.id].earningsPerDay,
          [i]: earningsPerDollar,
        };
      } else {
        earningsPerPool[poolCurrentDay.id] = {
          id: poolCurrentDay.id,
          totalEarningsUSD: earningsPerDollar,
          totalValueLockedUSD: poolCurrentDay.totalValueLockedUSD,
          feesUSD: currentDayFeesInUSD,
          earningsPerDay: {
            [i]: earningsPerDollar,
          },
        };
      }
    });
  }

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
      apr: poolWithEarnings.totalValueLockedUSD.eq(0) ? "0" : poolWithEarnings.earningsPerDay[0]
        .div(poolWithEarnings.totalValueLockedUSD)
        .mul(36500)
        .toString(),
    }));
};
