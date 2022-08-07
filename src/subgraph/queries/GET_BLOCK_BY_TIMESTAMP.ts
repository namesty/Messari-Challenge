import { gql } from "graphql-request";

export const GET_BLOCK_BY_TIMESTAMP = gql`
  query GetBlockByTimestamp($timestamp: Int!) {
    blocks(first: 1, orderBy: timestamp, orderDirection: desc, where:{ timestamp_lte: $timestamp}) {
      number
    }
  }
`