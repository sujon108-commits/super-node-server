import cors from "cors";
import express, { Express } from "express";
import { createServer, Server } from "http";
import OddsController from "./controllers/OddsController";
import RethinkController from "./controllers/RethinkController";
import "./database/redis";
import "./database/rethinkdb";
import router from "./routes";
import "./sockets/super-node";
import Websocket from "./sockets/Socket";
import { Socket } from "socket.io";
import OddSocket from "./sockets/OddSocket";
import { SuperNodeSocket } from "./sockets/super-node";
import { initCasinoSocket } from "./sockets/casino-node";

class App {
  app: Express;
  port: string | undefined;
  server: Server | undefined;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || "3515";
  }

  loadServer = async () => {
    this.server = createServer(this.app);
    const allowedOrigins = ["http://localhost:3000"];

    const options: cors.CorsOptions = {
      origin: "*",
    };
    this.app.use(cors(options));

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use("/api/", router);

    const io = Websocket.getInstance(this.server);
    io.on("connection", (socket: Socket) => {
      console.log(`New connection: ${socket.id}`);
      new OddSocket(socket);
    });

    SuperNodeSocket();
    initCasinoSocket();
    new RethinkController();
    new OddsController();

    this.server.listen(this.port, () => {
      console.log(
        `⚡️[server]: Server is running at http://localhost:${this.port}`
      );
    });
  };
}
export default new App();
