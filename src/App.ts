import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import { createServer, Server } from "http";
import OddsController from "./controllers/OddsController";
import "./database/redis";
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
  allowedOrigin = [
    "https://marketapi.store",
    "https://saphiregames.com",
    "https://setbet247.com",
    "https://vapbetting.com",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:3025",
    "http://localhost:3001",
  ];

  constructor() {
    this.app = express();
    this.port = process.env.PORT || "3525";
  }

  loadServer = async () => {
    this.server = createServer(this.app);

    const options: cors.CorsOptions = {
      origin: "*",
    };
    this.app.use(cors(options));
    this.app.use(this.whitelistOrigin);

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use("/api/", router);

    const io = Websocket.getInstance(this.server);
    io.on("connection", (socket: Socket) => {
      const origin = socket.handshake.headers.host;
      const isWhitelisted = this.allowedOrigin.some((allowedOrigin) =>
        allowedOrigin.includes(origin!)
      );

      if (!isWhitelisted) {
        // Reject the connection from an unauthorized origin
        socket.emit("You are not authorized");
        console.log(`Unauthorized connection rejected from: ${origin}`);
        socket.disconnect();
        return;
      }
      console.log(`New connection: ${socket.id}`);
      socket.join("getMarkets");
      new OddSocket(socket);
    });

    SuperNodeSocket();
    initCasinoSocket();
    new OddsController();

    this.server.listen(this.port, () => {
      console.log(
        `⚡️[server]: Server is running at http://localhost:${this.port}`
      );
    });
  };

  whitelistOrigin = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.host!;

    const isWhitelisted = this.allowedOrigin.some((allowedOrigin) =>
      allowedOrigin.includes(origin)
    );

    if (origin !== "marketapi.store") console.log(origin, isWhitelisted);

    if (isWhitelisted) {
      // Allow the request if the origin is in the whitelist
      // res.setHeader("Access-Control-Allow-Origin", origin);
      next();
    } else {
      // Deny the request if the origin is not in the whitelist
      res.status(403).send("Forbidden");
    }
  };
}
export default new App();
