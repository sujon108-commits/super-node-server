import dotenv from "dotenv";
dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});
import App from "./src/App";
import cluster from "cluster";
import { cpus } from "os";

if (cluster.isMaster) {
  const CPUS: any = cpus();

  CPUS.forEach(() => cluster.fork());

  cluster.on("disconnect", (worker) => {
    console.log("worker disconnected");
    worker.kill();
  });

  cluster.on("exit", (worker) => {
    console.log("worker exited");
    worker.kill();
  });

  cluster.on("exit", (worker: any, code: any, signal: any) => {
    cluster.fork();
  });
} else {
  App.loadServer();
  process.on("unhandledRejection", (e) => {});
  process.on("uncaughtException", (e) => {
    console.log(e.message);
  });
}
