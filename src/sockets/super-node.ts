import { io } from "socket.io-client";
import axios from "axios";
import Websocket from "./Socket";
import { fancyRepository } from "../schema/Fancy";
import { matchRepository } from "../schema/Match";
const socket = io(process.env.SUPER_NODE_URL!, {
  transports: ["websocket"],
});

export function SuperNodeSocket() {
  let clientIo = Websocket.getInstance();

  socket.on("connect", () => {
    console.log("connected super-node");
    socket.emit("joinMarketRoom-Super", "fancyEvents");
  });

  socket.on("newFancyAdded", (fancy) => {
    clientIo.emit("newFancyAdded", fancy);
  });

  socket.on("deactivateFancy-Super", (fancy) => {
    if (Object.keys(fancy).length > 0) {
      Object.keys(fancy).map((matchId) => {
        fancy[matchId].map(async (marketId: any) => {
          await fancyRepository.remove(`${matchId}-${marketId}`);
        });
      });

      clientIo.emit("deactivateFancy", fancy);
    }
  });

  socket.on("deactivateMarket-Super", async (marketData) => {
    try {
      if (marketData.type == "t10") {
        console.log("t10 matches", marketData);
        await matchRepository.remove(marketData.matchId);
      } else {
        axios
          .post(`${process.env.SITE_URL}/api/delete-market`, {
            ...marketData,
          })
          .catch((e) => {
            console.log(e);
          });
      }
      clientIo.emit("deactivateMarket", marketData);
    } catch (e: Error | any) {
      console.log("deactivateMarket-super", e.message);
    }
  });
}
export default socket;
