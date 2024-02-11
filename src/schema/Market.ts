import { Schema, Repository } from "redis-om";
import redis from "../database/redis";

export const marketSchema = new Schema(
  "Market",
  {
    marketId: { type: "string" },
    match: { type: "string", path: "$.match.id" },
    isActive: { type: "boolean" },
    isDelete: { type: "boolean" },
    marketStartTime: { type: "date" },
    oddsType: { type: "string" },
    marketName: { type: "string" },
    runners: { type: "string[]", path: "$.runners[*].selectionId" },
    series: { type: "string", path: "$.series.id" },
    sport: { type: "string", path: "$.sport.id" },
    offPlayMaxLimit: { type: "number" },
    offPlayMinLimit: { type: "number" },
    inPlayMaxLimit: { type: "number" },
    inPlayMinLimit: { type: "number" },
    inPlayBookMaxLimit: { type: "number" },
    inPlayBookMinLimit: { type: "number" },
    offPlayBookMaxLimit: { type: "number" },
    offPlayBookMinLimit: { type: "number" },
    inPlayFancyMaxLimit: { type: "number" },
    inPlayFancyMinLimit: { type: "number" },
    offPlayFancyMaxLimit: { type: "number" },
    offPlayFancyMinLimit: { type: "number" },
  },
  { dataStructure: "JSON" }
);

export const marketRepository = new Repository(marketSchema, redis);
(async () => {
  await marketRepository.createIndex();
})();
