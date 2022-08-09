import Big from "big.js";

export interface SubgraphPool {
  id: string;
  feesUSD: string;
  totalValueLockedUSD: string;
}

export interface Pool {
  id: string;
  cumulativeFeesUSD: Big;
  totalValueLockedUSD: Big;
  blockNumber: number;
}

export interface PoolWithEarnings {
  id: string;
  totalEarningsUSD: Big;
  blockNumber: number;
  dayData: {
    [daysAgo: number]: {
      earningsPerDollar: Big;
      totalValueLockedUSD: Big;
      feesUSD: Big;
      percentageOfPoolPerDollar: Big;
    };
  };
}
