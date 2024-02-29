import { Schema, Repository } from "redis-om";
import redis from "../database/redis";

export const matchSchema = new Schema(
  "Match",
  {
    matchId: { type: "number", sortable: true },
    type: { type: "string" },
  },
  { dataStructure: "JSON" }
);

export const matchRepository = new Repository(matchSchema, redis);
(async () => {
  await matchRepository.createIndex();
})();
