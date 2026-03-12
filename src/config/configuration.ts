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
