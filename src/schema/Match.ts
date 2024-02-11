import { Schema, Repository } from "redis-om";
import redis from "../database/redis";

export const matchSchema = new Schema(
  "Match",
  {
    matchId: { type: "number", sortable: true },
    matchOddsMarketId: { type: "string" },
    name: { type: "string", sortable: true },
    isActive: { type: "boolean", sortable: true },
    isDelete: { type: "boolean", sortable: true },
    isBookMaker: { type: "boolean" },
    isFancy: { type: "boolean" },
    isT10: { type: "boolean" },
    matchDateTime: { type: "date", sortable: true },
    series: { type: "string", path: "$.series.id", sortable: true },
    sport: { type: "string", path: "$.sport.id", sortable: true },
    inPlayFancyMaxLimit: { type: "number" },
    inPlayFancyMinLimit: { type: "number" },
    offPlayFancyMaxLimit: { type: "number" },
    offPlayFancyMinLimit: { type: "number" },
    odds: { type: "string[]" },
  },
  { dataStructure: "JSON" }
);

export const matchRepository = new Repository(matchSchema, redis);
(async () => {
  await matchRepository.createIndex();
})();
