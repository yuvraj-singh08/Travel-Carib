import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1", // Default Redis host
  port: 6379, // Default Redis port
  // password: "your_redis_password", // Uncomment if authentication is needed
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redis;
