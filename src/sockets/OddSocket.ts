import { Socket } from "socket.io";
import r from "rethinkdb";
import { tables } from "../utils/rethink-tables";
import rethink from "../database/rethinkdb";
import Websocket from "./Socket";

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
            this.io
              .to(market.new_val.matchId)
              .emit("getFancyData", market.new_val);
            this.io
              .to(+market.new_val.matchId)
              .emit("getFancyData", market.new_val);
          }
        });
      });
  }
}
export default OddSocket;
