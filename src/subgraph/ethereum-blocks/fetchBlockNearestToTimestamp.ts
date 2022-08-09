import { GraphQLClient } from "graphql-request";
import { ETHEREUM_BLOCKS_ENDPOINT } from "../../constants";
import { GET_BLOCK_BY_TIMESTAMP } from "./queries/GET_BLOCK_BY_TIMESTAMP";

const client = new GraphQLClient(ETHEREUM_BLOCKS_ENDPOINT, {});

interface SubgraphBlocks {
  blocks: [{ number: string }]
}

export const fetchBlockNearestToTimestamp = async (
  timestamp: number
): Promise<number> => {
  const { blocks } = await client.request<SubgraphBlocks>(
    GET_BLOCK_BY_TIMESTAMP,
    {
      timestamp,
    }
  );

  return Number(blocks[0].number);
};