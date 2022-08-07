import { gql } from 'graphql-request'

export const GET_POOLS_BY_BLOCK = gql`
  query GetPoolsByBlock($lastID: String, $block: Int!, $pageSize: Int!) {
    pools(first: $pageSize, where: { id_gt: $lastID }, block: { number: $block }) {
      id
      feesUSD
      totalValueLockedUSD
    }
  }
`