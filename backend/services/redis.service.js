// ✅ Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import Redis from 'ioredis';

// ✅ Use variables after loading them
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
  password: process.env.REDIS_PASSWORD
});

// ✅ Debug output
console.log('🔍 Redis Config:', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  parsedPort: parseInt(process.env.REDIS_PORT, 10)
});

// ✅ Redis connection listeners
redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export default redisClient;
