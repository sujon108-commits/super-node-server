import { Request, Response } from "express";
import socket from "../sockets/super-node";
import { marketRepository } from "../schema/Market";
import { IMarket, IMarketType, IRunnerType } from "../models/MarketModel";
import axios from "axios";

class SportController {
  public static async joinMarket(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { market } = req.body;
    try {
      if (market) socket.emit("joinMarketRoom-Super", market.marketId);
      return res.json({ status: true, message: "market added" });
    } catch (e) {
      const err = e as Error;
      return res.json({ status: false, message: err.message });
    }
  }

  public static async deactivateMarket(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      let winnerSelectionId = [];
      const { market: marketData } = req.body;
      const market: any = await marketRepository
        .search()
        .where("marketId")
        .equals(marketData.marketId)
        .return.first();

      if (market) {
        const winnerSid = marketData.runners.reduce(
          (sid: number, runner: any) => {
            if (runner.status == "WINNER") {
              sid = runner.selectionId;
            }
            return sid;
          },
          null
        );

        const winnerName = market.runners.reduce((win: any, name: any) => {
          if (name.selectionId == winnerSid) win = name.runnerName;

          return win;
        }, "");

        winnerSelectionId.push({
          selectionId: winnerSid,
          marketId: marketData.marketId,
        });

        SportController.redisMarketUpdateWinnerStatus(market, marketData);

        const getAllMarkets = await marketRepository
          .search()
          .where("match")
          .equals(market.match.id)
          .where("marketId")
          .not.eq(market.marketId)
          .where("oddsType")
          .not.eq(IMarketType.F)
          .return.all();

        await getAllMarkets.map((bmMarket) => {
          let runners: IRunnerType[] =
            bmMarket?.runners as unknown as IRunnerType[];
          let bmSid = null;
          if (bmMarket.marketName === "Tied Match") {
            runners = runners?.map((runner: IRunnerType) => {
              if (runner.runnerName.includes("NO")) {
                runner.status = "WINNER";
                winnerSelectionId.push({
                  selectionId: runner.selectionId,
                  marketId: bmMarket.marketId,
                });
              } else {
                runner.status = "LOSER";
              }

              return runner;
            }, null);

            SportController.redisMarketUpdateWinnerStatus(bmMarket, {
              ...bmMarket,
              status: marketData.status,
              runners,
            });
          } else {
            runners = runners?.map((runner: IRunnerType) => {
              if (runner.runnerName.includes(winnerName)) {
                runner.status = "WINNER";
                winnerSelectionId.push({
                  selectionId: runner.selectionId,
                  marketId: bmMarket.marketId,
                });
              } else {
                runner.status = "LOSER";
              }

              return runner;
            }, null);

            SportController.redisMarketUpdateWinnerStatus(bmMarket, {
              ...bmMarket,
              status: marketData.status,
              runners,
            });
          }
        });

        axios
          .post(`${process.env.NEST_SERVER_URL}/sport/deactivate-markets`, {
            markets: winnerSelectionId,
          })
          .catch((e) => {
            console.log(e);
          });
      }
      return res.json({
        status: true,
        message: "market deactivated",
        data: winnerSelectionId,
      });
    } catch (e) {
      const err = e as Error;
      return res.json({ status: false, message: err.message });
    }
  }

  static redisMarketUpdateWinnerStatus(market: any, marketData: any) {
    if (market) {
      market.status = marketData.status;
      market.isActive = false;
      const mergedArray = marketData.runners.map(
        ({ selectionId, status }: IRunnerType) => {
          const match = market.runners.find(
            (item2: IRunnerType) => selectionId == item2.selectionId
          );

          return {
            ...match,
            status,
          };
        }
      );
      market.runners = mergedArray;
      marketRepository.save(market);
    }
  }
}
export default SportController;
