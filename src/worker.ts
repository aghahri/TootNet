import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  const logger = new Logger('Worker');
  logger.log('Toot worker started');

  // Worker runs only background services
}

bootstrap();
