import { Schema, Repository } from "redis-om";
import redis from "../database/redis";

export const marketSchema = new Schema(
  "Market",
  {
    marketId: { type: "string" },
    marketName: { type: "string" },
    market: { type: "string" },
    markettype: { type: "string" },
    status: { type: "string" },
    matchId: { type: "number" },
    active: { type: "boolean" },
    inplay: { type: "boolean" },
    isDelete: { type: "boolean" },
    marketStartTime: { type: "string" },
    oddsType: { type: "string" },
    runners: { type: "string[]", path: "$.runners[*].selectionId" },
  },
  { dataStructure: "JSON" }
);

export const marketRepository = new Repository(marketSchema, redis);
(async () => {
  await marketRepository.createIndex();
})();
