import { Module } from '@nestjs/common';
import { NetworksService } from './networks.service';
import { NetworksController } from './networks.controller';

@Module({
  controllers: [NetworksController],
  providers: [NetworksService],
  exports: [NetworksService],
})
export class NetworksModule {}
