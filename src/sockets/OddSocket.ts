import r from "rethinkdb";
import { Socket } from "socket.io";
import MatchController from "../controllers/api/MatchController";
import rethink from "../database/rethinkdb";
import { tables } from "../utils/rethink-tables";
import Websocket from "./Socket";
import { IMarket, IRunnerType } from "../models/MarketModel";
const checkOddsLength = 3;
class OddSocket {
  io: any;
  constructor(private socket: Socket) {
    this.io = Websocket.getInstance();
    this.onMessage();
    this.changesListener();
  }

  onMessage() {
    this.socket.on("joinRoom", async (matchId: string) => {
      this.socket.join(matchId);
      // Send markets data immediately join user
      const marketsPromise = await r
        .table(tables.markets)
        .filter({ matchId: matchId.toString() })
        .run(await rethink);
      const markets = await marketsPromise.toArray();
      if (markets.length > 0) {
        console.log("join room", markets);
        markets.map((market: IMarket) => {
          const marketData = this.convertDataToMarket(market);
          this.socket.join(market.marketId);
          this.io.to(market.marketId).emit("getMarketData", {
            ...market,
            runners: marketData,
          });
        });
      }

      // Send Fancy data
      const fanciesPromise = await r
        .table(tables.fancies)
        .filter({ matchId: matchId.toString() })
        .run(await rethink);
      const fancies = await fanciesPromise.toArray();
      if (fancies.length > 0) {
        fancies.map((fancy: any) => {
          const fancyData = MatchController.createFancyDataAsMarket(fancy);
          this.io.to(fancy.matchId).emit("getFancyData", fancyData);
          this.io.to(+fancy.matchId).emit("getFancyData", fancyData);
        });
      }
    });
  }

  async changesListener() {
    r.table(tables.markets)
      .changes()
      .run(await rethink, (err, cursor) => {
        cursor.each((err, market) => {
          if (err) console.log(err);
          const marketData = this.convertDataToMarket(market.new_val);
          if (market && market.new_val) {
            this.io.to(market.new_val.marketId).emit("getMarketData", {
              ...market.new_val,
              runners: marketData,
            });
          }
        });
      });

    r.table(tables.fancies)
      .changes()
      .run(await rethink, (err, cursor) => {
        cursor.each((err, market) => {
          if (err) console.log(err);
          if (market && market.new_val) {
            const fancyData = MatchController.createFancyDataAsMarket(
              market.new_val
            );
            this.io.to(market.new_val.matchId).emit("getFancyData", fancyData);
            this.io.to(+market.new_val.matchId).emit("getFancyData", fancyData);
          }
        });
      });
  }

  convertDataToMarket(marketData: IMarket) {
    return marketData.runners.map(
      ({ selectionId, ex, status, ...restRunner }: IRunnerType) => {
        const backLength = checkOddsLength - ex?.availableToBack?.length! ?? 0;
        if (backLength) {
          for (let k = 0; k < backLength; k++) {
            ex?.availableToBack.push({ price: "-", size: "-" });
          }
        }

        const layLength = checkOddsLength - ex?.availableToLay?.length! ?? 0;
        if (layLength) {
          for (let k = 0; k < layLength; k++) {
            ex?.availableToLay.push({ price: "-", size: "-" });
          }
        }

        return {
          ...restRunner,
          status,
          back: ex?.availableToBack.reverse(),
          lay: ex?.availableToLay,
        };
      }
    );
  }
}
export default OddSocket;
