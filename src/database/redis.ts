import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL || "redis://:123456@localhost:6379",
});
redis.on("error", (err) => console.log("Redis Client Error", err));
redis.on("connect", () => console.log("Redis connected"));
(async () => {
  await redis.connect();
})();

export const redisReplica = createClient({
  url: process.env.REDIS_URL_REPLICA || "redis://:123456@localhost:6379",
});
redisReplica.on("error", (err) => console.log("Redis Client Error", err));
redisReplica.on("connect", () => console.log("Redis connected"));
(async () => {
  await redisReplica.connect();
})();

export default redis;
