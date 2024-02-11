import { Socket } from "socket.io";
import r from "rethinkdb";
import { tables } from "../utils/rethink-tables";
import rethink from "../database/rethinkdb";
import Websocket from "./Socket";
import { IMarketType } from "../models/MarketModel";
import { IFancy } from "../models/FancyModel";

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
        markets.map((market: any) => {
          this.socket.join(market.marketId);
          this.io.to(market.marketId).emit("getMarketData", market);
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
          this.io.to(fancy.matchId).emit("getFancyData", fancy);
          this.io.to(+fancy.matchId).emit("getFancyData", fancy);
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

          if (market && market.new_val) {
            this.io
              .to(market.new_val.marketId)
              .emit("getMarketData", market.new_val);
          }
        });
      });

    r.table(tables.fancies)
      .changes()
      .run(await rethink, (err, cursor) => {
        cursor.each((err, market) => {
          if (err) console.log(err);
          if (market && market.new_val) {
            const fancyData = this.createFancyDataAsMarket(market.new_val);
            this.io.to(market.new_val.matchId).emit("getFancyData", fancyData);
            this.io.to(+market.new_val.matchId).emit("getFancyData", fancyData);
          }
        });
      });
  }

  createFancyDataAsMarket(data: IFancy) {
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
export default OddSocket;
