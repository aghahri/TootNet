import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const redisUrl =
    config.get<string>('redis.url') ??
    (config.get<string>('redis.host')
      ? `redis://${config.get<string>('redis.host')}:${config.get<number>('redis.port') ?? 6379}`
      : null);
  const useRedisAdapter = config.get<boolean>('socketIoRedis.enabled') && redisUrl;
  if (useRedisAdapter) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisIoAdapter);
  } else {
    app.useWebSocketAdapter(new IoAdapter(app));
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Toot backend running on http://localhost:${port}`);
}

bootstrap().catch(console.error);
