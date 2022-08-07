import { gql } from 'graphql-request'

export const GET_POOLS = gql`
  query GetPools($lastID: String){
    pools(first: 1000, where: { id_gt: $lastID }) {
      id
      feesUSD
      totalValueLockedUSD
    }
  }
`