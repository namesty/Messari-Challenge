import { SubgraphPool } from "../subgraph/uniswap/types";
import { MongoClient, Db } from "mongodb";

const connectToDb = async (): Promise<Db> => {
  const uri = "mongodb://namesty:namestysecret@localhost:27017";
  const client = new MongoClient(uri);
  const db = client.db("messari")

  return db;
}

interface DayCache {
  unixHourTimestamp: number;
  pools: SubgraphPool[];
}

export const cachePools = async (pools: SubgraphPool[], unixHourTimestamp: number) => {
  try {
    const db = await connectToDb();
    const collection = db.collection("pools");
  
    collection.insertOne({
      unixHourTimestamp,
      pools,
    })
  } catch(e) {
    console.log("Could not connect to DB. Not caching subgraph results")
  }
}

export const getCachedPools = async (unixHourTimestamp: number) => {
  try {
    const db = await connectToDb();
    const collection = db.collection("pools");
  
    const cachedPools = await collection.findOne<DayCache>({
      unixHourTimestamp
    });
  
    return cachedPools;
  } catch(e) {
    console.log("Could not connect to DB. Ignoring cache")
    return null
  }
}