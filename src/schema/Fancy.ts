import { Schema, Repository } from "redis-om";
import redis from "../database/redis";

export const fancySchema = new Schema(
  "Fancy",
  {
    matchId: { type: "number", sortable: true },
    SelectionId: { type: "number", sortable: true },
    RunnerName: { type: "string" },
    LayPrice1: { type: "number" },
    LaySize1: { type: "number" },
    LayPrice2: { type: "number" },
    LaySize2: { type: "number" },
    LayPrice3: { type: "number" },
    LaySize3: { type: "number" },
    BackPrice1: { type: "number" },
    BackSize1: { type: "number" },
    BackPrice2: { type: "number" },
    BackSize2: { type: "number" },
    BackPrice3: { type: "number" },
    BackSize3: { type: "number" },
    GameStatus: { type: "string" },
    gtype: { type: "string", sortable: true },
    min: { type: "number" },
    max: { type: "number" },
    sr_no: { type: "number" },
    rem: { type: "string" },
    ballsess: { type: "number" },
  },
  { dataStructure: "HASH" }
);

export const fancyRepository = new Repository(fancySchema, redis);
(async () => {
  await fancyRepository.createIndex();
})();
