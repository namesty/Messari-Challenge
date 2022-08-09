# Uniswap V3 Pool Profitability Tool

This is a CLI tool that finds the most profitable liquidity pool, given a number of days. The profitability of each pool is measured by calculating how much fees would a user have earned over the course of the past X days, per USD deposited into the liquidity pool.

## Instructions

1. Install dependencies:

```sh
yarn
```

2. Build project:

```
yarn build
```

3. Start MongoDB instance for caching (Optional)

```
yarn cache:up
```

4. Run the program with:

```sh
yarn start find `n`
```

Where `n` is the number of days ago to consider. Example:

```
yarn start find 8
```

1. To run the program considering/using the Mongo cache:

```
yarn start find 8 --use-cache
```

NOTE: to tear down MongoDB container run `yarn cache:down`
