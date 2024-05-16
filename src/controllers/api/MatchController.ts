import axios from "axios";
import { Request, Response } from "express";
import { IFancy } from "../../interfaces/FancyModel";
import { IMarketType } from "../../interfaces/MarketModel";
import { fancyRepository } from "../../schema/Fancy";
import { marketRepository } from "../../schema/Market";
import { matchRepository } from "../../schema/Match";
import api from "../../utils/api";
import Websocket from "../../sockets/Socket";
import { eventJson } from "../../utils/casino-types";
import { getParameters } from "../../utils/helper";

class MatchController {
  public static async addMatchAndMarket(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { matches }: any = req.body;

      if (
        matches &&
        matches.length > 0 &&
        !matches[0].matchId &&
        !matches[0].sportId
      ) {
        return res
          .status(401)
          .json({ message: "Please send matchId and sportId", error: true });
      }
      const matchIds = matches.map(({ matchId }: any) => matchId.toString());

      api
        .post(`save-match`, {
          matches: matches.map((match: any) => ({
            ...match,
            matchId: match.matchId.toString(),
            sportId: match.sportId.toString(),
          })),
        })
        .then((res) => console.log("res"))
        .catch((e: any) => {
          console.log("err", e.response, e.config);
        });

      const matchWithSportsId = matches.reduce(
        (acc: any, { sportId, matchId }: any) => {
          acc[sportId] = acc[sportId] || [];
          if (!acc[sportId].includes(matchId)) {
            acc[sportId].push(matchId);
          }
          return acc;
        },
        {}
      );
      Object.keys(matchWithSportsId).map((sportId: string) => {
        const T10MatchIds = matchWithSportsId[sportId].filter(
          (match: string) => match.includes("111") || match.includes("120")
        );

        const otherMatchIds = matchWithSportsId[sportId].filter(
          (match: string) => !match.includes("111") || !match.includes("120")
        );

        if (otherMatchIds.length > 0) {
          const marketsData = MatchController.marketsData(
            otherMatchIds,
            `get-marketes?sportId=${sportId}&EventID=`
          );
          const bookMarketsData = MatchController.marketsData(
            otherMatchIds,
            `get-bookmaker-marketes?sportId=${sportId}&EventID=`
          );

          if (matchIds.length > 0) {
            matchIds.map(async (matchId: any) => {
              await matchRepository.save(matchId, {
                matchId: +matchId,
              });
            });
          }

          Promise.allSettled([marketsData, bookMarketsData]).then(
            async (markets: any) => {
              markets.map((market: { status: string; value: any }) => {
                if (market.status === "fulfilled") {
                  const keys = Object.keys(market.value);
                  if (keys.length > 0) {
                    keys.map((key) => {
                      market.value[key].map(
                        async (m: {
                          marketId: string;
                          marketName: string;
                          matchId: string;
                        }) => {
                          await marketRepository.save(m.marketId, m);
                        }
                      );
                    });
                  }
                }
              });
            }
          );

          if (sportId == "4") {
            otherMatchIds.map((matchId: string) => {
              api
                .get(`get-sessions?MatchID=${matchId}`)
                .then(async (res: any) => {
                  res.data.sports.map(async (fancy: any) => {
                    fancy = {
                      ...fancy,
                      SelectionId: +fancy.SelectionId,
                      min: +fancy.min,
                      max: +fancy.max,
                      sr_no: +fancy.sr_no,
                      ballsess: +fancy.ballsess || 1,
                    };

                    await fancyRepository.save(
                      `${matchId}-${fancy.SelectionId}`,
                      {
                        ...fancy,
                        matchId: +matchId,
                      }
                    );
                  });
                })
                .catch(() => {});
            });
          }
        }

        if (T10MatchIds.length > 0 && sportId == "4") {
          T10MatchIds.forEach(async (matchId: string) => {
            const matchData = await matchRepository
              .search()
              .where("matchId")
              .equals(matchId)
              .return.first();

            if (matchData) {
              matchData.matchId = matchId;
              matchRepository.save(matchData);
            } else {
              await matchRepository.save(matchId.toString(), {
                matchId: matchId,
                type: "t10",
              });
            }
          });

          T10MatchIds.map((matchId: string) => {
            api
              .get(`get-sessions-t10?MatchID=${matchId}`)
              .then(async (res: any) => {
                res.data.sports.map(async (fancy: any) => {
                  const fancyData = await fancyRepository
                    .search()
                    .where("matchId")
                    .equals(matchId)
                    .where("SelectionId")
                    .equals(fancy.SelectionId)
                    .return.first();

                  if (fancyData) {
                    fancyRepository.save({
                      ...fancy,
                      ...fancyData,
                    });
                  } else {
                    await fancyRepository.save(
                      `${matchId}-${fancy.SelectionId}`,
                      fancy
                    );
                  }
                });
              })
              .catch(() => {});
          });
        }
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
            const params = getParameters(res.config.url);

            acc[params[1].value] = res.data.sports.map(
              ({ marketId, marketName, event }: any) => ({
                marketId,
                marketName,
                matchId: +event?.id || +params[1].value,
                oddsType: url.includes("bookmaker") ? "BM" : "M",
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
      if (!marketData.marketId) return res.json({ success: false });

      const markets: any = await marketRepository
        .search()
        .where("marketId")
        .equals(marketData.marketId)
        .where("marketName")
        .equals("Match Odds")
        .return.all();

      if (markets && markets?.length > 0) {
        markets.map(async (market: any) => {
          await marketRepository.remove(market.marketId);
        });

        await matchRepository.remove(markets[0].matchId);
        const ids = await fancyRepository
          .search()
          .where("matchId")
          .equals(markets[0].matchId)
          .return.allIds();
        await fancyRepository.remove(...ids);
      } else {
        await marketRepository.remove(marketData.marketId);
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

  public static testingSocketEvents(
    req: Request,
    res: Response | any
  ): Promise<Response> {
    try {
      const { data } = req.body;
      const io = Websocket.getInstance();
      io.emit(data.event, data.data);
      return res.json({ success: true, message: "matches added" });
    } catch (e: Error | any) {
      return res.json(e.stack);
    }
  }
}

export default MatchController;
