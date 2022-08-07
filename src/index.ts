import { fetchPoolData } from "./subgraph/fetchPoolData";

export const execute = async () => {
  const earnings = await fetchPoolData(3)
  console.log(earnings.find(e => e.id === "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"))
}

execute();