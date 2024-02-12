import r from "rethinkdb";
import { io } from "socket.io-client";
import rethink from "../database/rethinkdb";
import { tables } from "../utils/rethink-tables";
import axios from "axios";
import Websocket from "./Socket";
let clientIo = Websocket.getInstance();

const socket = io(process.env.SUPER_NODE_URL!, {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("connected super-node");
  //new SocketController();
  socket.emit("joinMarketRoom-Super", "fancyEvents");
});

socket.on("newFancyAdded", (fancy) => {
  axios
    .post(`${process.env.NEST_SERVER_URL}/sport/add-new-fancy`, {
      ...fancy.fancy,
      matchId: fancy.matchId,
    })
    .then((res) => {
      if (res.data.data)
        clientIo
          .to(fancy.matchId)
          .emit("addNewFancy", { ...res.data.data, ...fancy });
    })
    .catch((e) => console.log("new", e.stack, e.response));
});

socket.on("deactivateFancy-Super", (fancy) => {
  if (Object.keys(fancy).length > 0) {
    Object.keys(fancy).map((matchId) => {
      fancy[matchId].map(async (marketId: any) => {
        clientIo
          .to(fancy.matchId)
          .emit("removeFancy", { matchId, marketId: `${matchId}-${marketId}` });

        await r
          .table(tables.fancies)
          .get(`${matchId}-${marketId}`)
          .delete()
          .run(await rethink);
        axios
          .post(`${process.env.NEST_SERVER_URL}/sport/deactivate-fancy`, {
            marketId: `${matchId}-${marketId}`,
          })
          .catch((e) => console.log("deac", e.stack));
      });
    });
  }
});

socket.on("deactivateMarket-Super", async (marketData) => {
  try {
    console.log(marketData);

    const getMatchId = await r
      .table(tables.markets)
      .filter({ id: marketData.marketId, marketName: "Match Odds" })
      //@ts-expect-error
      .pluck(["matchId", "marketName", "marketId"])
      .run(await rethink);
    const markets = await getMatchId.toArray();
    if (markets.length > 0) {
      markets.map(async (market) => {
        await r
          .table(tables.markets)
          .get(market.marketId)
          .delete()
          .run(await rethink);
      });
    } else {
      await r
        .table(tables.markets)
        .get(marketData.marketId)
        .delete()
        .run(await rethink);
    }
    // axios
    //   .post(`${process.env.NEST_SERVER_URL}/sport/deactivate-market`, {
    //     market: marketData,
    //   })
    //   .catch((e) => {
    //     console.log(e);
    //   });
  } catch (e: Error | any) {
    console.log("deactivateMarket-super", e.message);
  }
});

export default socket;
