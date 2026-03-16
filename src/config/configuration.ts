export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  socketIoRedis: {
    enabled: process.env.SOCKET_IO_REDIS_ENABLED === 'true',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : undefined,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET ?? 'toot-media',
  },
  throttle: {
    defaultTtl: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    defaultLimit: parseInt(process.env.THROTTLE_DEFAULT_LIMIT ?? '100', 10),
    authTtl: 60000,
    authLimit: 5,
    authRefreshLimit: 10,
    reportLimit: 10,
    messageLimit: 30,
    notificationsLimit: 30,
  },
});
