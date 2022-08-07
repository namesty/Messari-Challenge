import { GraphQLClient } from "graphql-request";
import { SUBGRAPH_ENDPOINT } from "../../constants";
import { GET_POOLS_BY_BLOCK } from "./queries/GET_POOLS_BY_BLOCK";
import { SubgraphPool } from "./types";

const PAGE_SIZE = 1000;
const client = new GraphQLClient(SUBGRAPH_ENDPOINT, {});

export const fetchPoolsByBlock = async (
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
    const nextFetchedPools = await fetchPoolsByBlock(
      blockNumber,
      newLastID
    );
    pools.push(...nextFetchedPools);
  }

  return pools;
};
