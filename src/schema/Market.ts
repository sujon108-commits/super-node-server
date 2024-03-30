import { Schema, Repository } from "redis-om";
import redis from "../database/redis";

export const marketSchema = new Schema(
  "Market",
  {
    marketId: { type: "string", sortable: true },
    marketName: { type: "string", sortable: true },
    market: { type: "string", sortable: true },
    markettype: { type: "string", sortable: true },
    status: { type: "string", sortable: true },
    matchId: { type: "number", sortable: true },
    active: { type: "boolean", sortable: true },
    inplay: { type: "boolean", sortable: true },
    isDelete: { type: "boolean", sortable: true },
    marketStartTime: { type: "string", sortable: true },
    oddsType: { type: "string", sortable: true },
    runners: {
      type: "string",
      path: "$.runners[*].selectionId",
      sortable: true,
    },
  },
  { dataStructure: "HASH" }
);

export const marketRepository = new Repository(marketSchema, redis);
(async () => {
  await marketRepository.createIndex();
})();
