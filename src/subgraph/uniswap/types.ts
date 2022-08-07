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
}

export interface PoolWithEarnings {
  id: string;
  feesUSD: Big;
  totalValueLockedUSD: Big;
  totalEarningsUSD: Big;
  earningsPerDay: {
    [daysAgo: number]: Big;
  };
}

export interface FormattedPool {
  id: string;
  feesUSD: string;
  totalValueLockedUSD: string;
  totalEarningsUSD: string;
  earningsPerDay: {
    [daysAgo: number]: string;
  };
  apr: string;
}