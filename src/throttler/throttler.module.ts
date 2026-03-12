import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Rate limiting: in-memory by default.
 * For multi-instance deployments, set REDIS_URL and use a custom ThrottlerStorage
 * (e.g. @nest-lab/throttler-storage-redis) in useFactory to pass storage.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('throttle.defaultTtl', 60000),
            limit: config.get<number>('throttle.defaultLimit', 100),
          },
        ],
      }),
    }),
  ],
})
export class AppThrottlerModule {}
