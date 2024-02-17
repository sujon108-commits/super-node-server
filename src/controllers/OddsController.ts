import r from "rethinkdb";
import { redisReplica } from "../database/redis";
import rethink from "../database/rethinkdb";
import { tables } from "../utils/rethink-tables";

export default class OddsController {
  constructor() {
    try {
      this.saveMarkets();
      this.saveFancies();
    } catch (e) {
      console.log(e);
    }
  }

  chunkArray = (array: any[], chunkSize: number) =>
    array.reduce(
      (acc, _, i) =>
        i % chunkSize ? acc : [...acc, array.slice(i, i + chunkSize)],
      []
    );

  async saveMarkets() {
    setInterval(async () => {
      const marketsPromise = await r.table(tables.markets).run(await rethink);
      const markets = await marketsPromise.toArray();
      if (markets.length > 0) {
        markets.map((market: any) => {
          redisReplica
            .get(`odds-market-${market.marketId}`)
            .then(async (value) => {
              if (value) {
                const marketData = JSON.parse(value);
                await r
                  .table(tables.markets)
                  .insert(
                    { ...market, ...marketData, id: marketData.marketId },
                    { conflict: "update" }
                  )
                  .run(await rethink);
              }
            })
            .catch(console.log);
        });
      }
    }, 250);
  }

  async saveFancies() {
    setInterval(async () => {
      const matchPromise = await r
        .table(tables.matches)
        .pluck("matchId")
        .run(await rethink);
      const matches = await matchPromise.toArray();
      if (matches.length > 0) {
        matches.map(({ matchId }: any) => {
          redisReplica.get(`fancy-${matchId}`).then(async (value: any) => {
            if (value) {
              const fancies = JSON.parse(value);
              fancies.map(async (fancy: any) => {
                await r
                  .table(tables.fancies)
                  .insert(
                    {
                      ...fancy,
                      matchId,
                      id: `${matchId}-${fancy.SelectionId}`,
                    },
                    { conflict: "update" }
                  )
                  .run(await rethink);
              });
            }
          });
        });
      }
    }, 250);
  }
}
