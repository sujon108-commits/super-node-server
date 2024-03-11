import { Socket } from "socket.io";
import MatchController from "../controllers/api/MatchController";
import Websocket from "./Socket";
import { IMarket, IRunnerType } from "../interfaces/MarketModel";
import { marketRepository } from "../schema/Market";
import { fancyRepository } from "../schema/Fancy";
const checkOddsLength = 3;
class OddSocket {
  io: any;
  constructor(private socket: Socket) {
    this.io = Websocket.getInstance();
    this.onMessage();
  }

  onMessage() {
    this.socket.on("joinRoom", async (matchId: string) => {
      this.socket.join(matchId);
      matchId = matchId.toString();
      this.socket.join(matchId);
      const markets = await marketRepository
        .search()
        .where("matchId")
        .eq(matchId)
        .return.all();

      if (markets.length > 0) {
        markets.map((market) => {
          //@ts-expect-error
          const marketData = OddSocket.convertDataToMarket(market as IMarket);
          this.io.to("getMarkets").emit("getMarketData", {
            ...market,
            runners: marketData,
          });

          this.io.to(matchId).emit("getMarketData", {
            ...market,
            runners: marketData,
          });
        });
      }

      const fancies = await fancyRepository
        .search()
        .where("matchId")
        .eq(matchId)
        .return.all();

      if (fancies.length > 0) {
        fancies.map((fancy: any) => {
          const fancyData = MatchController.createFancyDataAsMarket(fancy);

          this.io.to("getMarkets").emit("getFancyData", {
            ...fancy,
          });

          this.io.to(matchId).emit("getFancyData", {
            ...fancy,
          });

          this.io.to("getMarkets").emit("getFancyData-new", {
            ...fancy,
            ...fancyData,
            marketId: `${matchId}-${fancy.SelectionId}`,
          });

          this.io.to(matchId).emit("getFancyData-new", {
            ...fancy,
            ...fancyData,
            marketId: `${matchId}-${fancy.SelectionId}`,
          });
        });
      }
    });

    this.socket.on("joinMarketRoom", async (room) => {
      this.socket.join(room);
      const market = await marketRepository
        .search()
        .where("marketId")
        .eq(room)
        .return.first();

      if (market) {
        //@ts-expect-error
        const marketData = OddSocket.convertDataToMarket(market as IMarket);

        this.io.to(market.marketId).emit("getMarketData", {
          ...market,
          runners: marketData,
        });
      }
    });

    this.socket.on("leaveRoom", async (matchId: string) => {
      this.socket.leave(matchId.toString());
    });
  }

  public static convertDataToMarket(marketData: IMarket) {
    if (!marketData || !marketData.runners) return [];

    return marketData?.runners?.map(
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
          selectionId,
          runnerName: restRunner.runner || restRunner.runnerName,
          status,
          back: ex?.availableToBack,
          lay: ex?.availableToLay,
          ex,
        };
      }
    );
  }
}
export default OddSocket;
