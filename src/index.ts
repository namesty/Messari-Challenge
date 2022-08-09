import { getPoolsByProfitability } from "./services/getPoolsByProfitability";
import { Command } from 'commander';

const program = new Command();

program
  .name('Uniswap V3 - Most Profitable Pool Finder')
  .description('CLI to find most profitable pool in Uniswap V3, given a number of days ago')
  .version('0.0.1');

program.command('find')
  .description('Find most profitable pool')
  .argument('<number>', 'number of days ago')
  .option('--no-cache', 'ignore MongoDB hourly cache')
  .action(async (num, options) => {
    const noCache = options.noCache;
    const numberOfDaysAgo = Number(num);
    const pools = await getPoolsByProfitability(numberOfDaysAgo, noCache);
    console.log("\nMost Profitable Pool: " + JSON.stringify(pools[0], null, 2));
  });

program.parse(process.argv);