import { redisReplica } from "../database/redis";
import { matchRepository } from "../schema/Match";
import { fancyRepository } from "../schema/Fancy";
import { marketRepository } from "../schema/Market";
import _ from "lodash";
import Websocket from "../sockets/Socket";
import OddSocket from "../sockets/OddSocket";
import MatchController from "./api/MatchController";
import { EntityId, EntityKeyName } from "redis-om";

export default class OddsController {
  io: any;
  constructor() {
    try {
      this.io = Websocket.getInstance();
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
      const markets = await marketRepository.search().return.all();
      if (markets.length > 0) {
        markets.map((market: any) => {
          redisReplica
            .get(`odds-market-${market.marketId}`)
            .then(async (value) => {
              if (value) {
                const marketData = JSON.parse(value);

                marketData.runners = marketData.runners.map((runner: any) => {
                  if (runner.back && runner.back.length > 0)
                    runner.ex.availableToBack = runner.back;
                  return {
                    ...runner,
                    runnerName: runner.runner || runner.runnerName,
                    selectionId: runner.selectionId.toString(),
                  };
                });
                const convertedData = OddSocket.convertDataToMarket({
                  ...market,
                  ...marketData,
                });
                marketData.runners = convertedData;
                if (!_.isEqual(market.runners, marketData.runners)) {
                  this.io.to(market.matchId).emit("getMarketData", {
                    ...market,
                    ...marketData,
                  });
                  this.io.to(market.marketId).emit("getMarketData", {
                    ...market,
                    ...marketData,
                  });

                  this.io.to("getMarkets").emit("getMarketData", {
                    ...market,
                    ...marketData,
                  });
                }

                await marketRepository.save(market.marketId, {
                  ...market,
                  ...marketData,
                });
              }
            })
            .catch(console.log);
        });
      }
    }, 1000);
  }

  async saveFancies() {
    setInterval(async () => {
      const matches = await matchRepository.search().return.all();

      if (matches.length > 0) {
        matches.map(({ matchId }: any) => {
          redisReplica.get(`fancy-${matchId}`).then(async (value: any) => {
            if (value) {
              const fancies = JSON.parse(value);
              fancies.map(async (fancy: any) => {
                const fancyRedis = await fancyRepository.fetch(
                  `${matchId}-${fancy.SelectionId}`
                );

                delete fancyRedis[EntityId];
                delete fancyRedis[EntityKeyName];

                if (
                  !_.isEqual(
                    {
                      ...fancyRedis,
                    },
                    { ...fancy, matchId }
                  )
                ) {
                  const fancyData = MatchController.createFancyDataAsMarket({
                    ...fancyRedis,
                    ...fancy,
                  });
                  this.io.to(matchId).emit("getFancyData", {
                    ...fancyRedis,
                    ...fancy,
                  });

                  this.io.to(matchId).emit("getFancyData-new", {
                    ...fancy,
                    ...fancyData,
                    marketId: `${matchId}-${fancy.SelectionId}`,
                  });

                  this.io.to("getMarkets").emit("getFancyData", {
                    ...fancyRedis,
                    ...fancy,
                  });

                  this.io.to("getMarkets").emit("getFancyData-new", {
                    ...fancy,
                    ...fancyData,
                    marketId: `${matchId}-${fancy.SelectionId}`,
                  });
                }

                await fancyRepository.save(`${matchId}-${fancy.SelectionId}`, {
                  ...fancy,
                  matchId: +matchId,
                });
              });
            }
          });
        });
      }
    }, 250);
  }
}
