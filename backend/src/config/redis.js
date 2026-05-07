const Redis = require('ioredis');
const logger = require('./logger');

let client = null;

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
};

async function createClient() {
  client = new Redis(REDIS_CONFIG);

  client.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting');
  });

  await client.connect();
  return client;
}

function getClient() {
  if (!client) throw new Error('Redis not initialized. Call createClient() first.');
  return client;
}

module.exports = { createClient, getClient };
