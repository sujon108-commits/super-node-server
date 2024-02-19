import axios from "axios";
import { Request, Response } from "express";
import r from "rethinkdb";
import rethink from "../../database/rethinkdb";
import { tables } from "../../utils/rethink-tables";
import OddSocket from "../../sockets/OddSocket";
import { IMarketType } from "../../interfaces/MarketModel";
import { IFancy } from "../../interfaces/FancyModel";
import api from "../../utils/api";

class MatchController {
  public static async addMatchAndMarket(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { matches }: any = req.body;

      if (matches && matches.length > 0 && !matches[0].matchId) {
        return res
          .status(401)
          .json({ message: "Please send matchId", error: true });
      }
      const matchIds = matches.map(({ matchId }: any) => matchId.toString());

      api
        .post(`save-match`, {
          matches: matches.map((match: any) => ({
            ...match,
            matchId: match.matchId.toString(),
          })),
        })
        .then((res) => console.log("res"))
        .catch((e: any) => {
          console.log("err", e.response, e.config);
        });

      const marketsData = MatchController.marketsData(
        matchIds,
        `get-marketes?EventID=`
      );

      const bookMarketsData = MatchController.marketsData(
        matchIds,
        `get-bookmaker-marketes?EventID=`
      );

      Promise.allSettled([marketsData, bookMarketsData]).then(
        async (markets: any) => {
          const matchesData: any = {};
          const marketsData: any = {};
          markets.map((market: { status: string; value: any }) => {
            if (market.status === "fulfilled") {
              const keys = Object.keys(market.value);
              if (keys.length > 0) {
                keys.map((key) => {
                  market.value[key].map(
                    (m: {
                      marketId: string;
                      marketName: string;
                      matchId: number | string;
                    }) => {
                      matchesData[m.matchId] = {
                        id: m.matchId,
                        matchId: m.matchId,
                      };
                      marketsData[m.marketId] = { ...m, id: m.marketId };
                    }
                  );
                });
              }
            }
          });

          await r
            .table(tables.matches)
            .insert(Object.values(matchesData), { conflict: "update" })
            .run(await rethink);

          await r
            .table(tables.markets)
            .insert(Object.values(marketsData), { conflict: "update" })
            .run(await rethink);
        }
      );

      matchIds.map((matchId: string) => {
        api
          .get(`get-sessions?MatchID=${matchId}`)
          .then(async (res: any) => {
            res.data.sports.map(async (fancy: any) => {
              await r
                .table(tables.fancies)
                .insert(
                  { ...fancy, id: `${matchId}-${fancy.SelectionId}` },
                  { conflict: "update" }
                )
                .run(await rethink);
            });
          })
          .catch(() => {});
      });

      return res.json({ success: true, message: "matches added" });
    } catch (e: Error | any) {
      return res.json(e.stack);
    }
  }

  static marketsData = (matchIds: [], url: string) => {
    return new Promise((resolve, reject) => {
      const requests = matchIds.map((matchId: string) =>
        api.get(`${url}${matchId}`, {
          params: { retry: 3 },
        })
      );

      axios
        .all(requests)
        .then((responses) => {
          const matches = responses.reduce((acc: any, res: any) => {
            acc[res.config.url?.split("=")[1]] = res.data.sports.map(
              ({ marketId, marketName, event }: any) => ({
                marketId,
                marketName,
                matchId: event?.id || res.config.url?.split("=")[1],
              })
            );
            return acc;
          }, {});
          resolve(matches);
        })
        .catch((e: any) => reject(e.stack));
    });
  };

  public static async deleteMarket(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const marketData = req.body;

      const getMatchId = await r
        .table(tables.markets)
        .filter({ id: marketData.marketId, marketName: "Match Odds" })
        //@ts-expect-error
        .pluck(["matchId", "marketName", "marketId"])
        .run(await rethink);
      const markets = await getMatchId.toArray();
      console.log(markets);
      if (markets.length > 0) {
        markets.map(async (market) => {
          await r
            .table(tables.markets)
            .get(market.marketId)
            .delete()
            .run(await rethink);
        });

        await r
          .table(tables.matches)
          .get(markets[0].matchId)
          .delete()
          .run(await rethink);
      } else {
        await r
          .table(tables.markets)
          .get(marketData.marketId)
          .delete()
          .run(await rethink);
      }
      return res.json(req.body);
    } catch (e: Error | any) {
      return res.json(e.stack);
    }
  }

  public static createFancyDataAsMarket(data: IFancy) {
    const layPriceKeys = Object.keys(data).filter((key) =>
      key.startsWith("BackPrice")
    );
    const runners = [];
    for (let i = 1; i <= layPriceKeys.length; i++) {
      let back = {};
      let lay = {};
      if (data[`LayPrice${i}`] != undefined) {
        lay = { price: data[`LayPrice${i}`], size: data[`LaySize${i}`] };
      }
      if (data[`BackPrice${i}`] != undefined) {
        back = { price: data[`BackPrice${i}`], size: data[`BackSize${i}`] };
      }
      //Todo: I added only one runner if need 3 then will it to 3 with condition
      if (i == 1)
        runners.push({
          lay,
          back,
          selectionId: data.SelectionId,
          runnerName: "",
          status: data.GameStatus,
          sortPriority: i,
        });
    }

    return {
      marketName: data.RunnerName,
      runners,
      oddsType: IMarketType.F,
      min: data.min,
      max: data.max,
      rem: data.rem,
      sortPriority: data.sr_no,
      fancyType: data.gtype,
    };
  }
}

export default MatchController;
