import { createClient } from "redis";

export const redisReplica = createClient({
  url: process.env.REDIS_URL_REPLICA || "redis://:123456@localhost:6379",
});
export const redisReplicaSub = redisReplica.duplicate();
redisReplica.on("error", (err) => console.log("Redis replica Error", err));
redisReplica.on("connect", () => console.log("Redis connected"));
(async () => {
  await redisReplica.connect();
  await redisReplicaSub.connect();
})();

export const redisSuperNode = createClient({
  url: process.env.REDIS_URL_SUPER_NODE_FOR_BM,
});

redisSuperNode.on("error", (err) =>
  console.log("redisSuperNode Client Error:===", err)
);
redisSuperNode.on("connect", () => console.log("redisSuperNode connected"));
(async () => {
  await redisSuperNode.connect();
})();

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redis.on("error", (err) => console.log("Redis Client Error:===", err));
redis.on("connect", () => console.log("Redis connected"));
(async () => {
  await redis.connect();
})();

export default redis;
