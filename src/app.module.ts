import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NetworksModule } from './networks/networks.module';
import { GroupsModule } from './groups/groups.module';
import { ChannelsModule } from './channels/channels.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';
import { ModerationModule } from './moderation/moderation.module';
import { ShowcaseModule } from './showcase/showcase.module';
import { DiscoverModule } from './discover/discover.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppThrottlerModule } from './throttler/throttler.module';
import { AuditModule } from './audit/audit.module';
import { MediaModule } from './media/media.module';
import { PostsModule } from './posts/posts.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AppThrottlerModule,
    PrismaModule,
    AuditModule,
    MediaModule,
    PostsModule,
    PermissionsModule,
    AuthModule,
    UsersModule,
    NetworksModule,
    GroupsModule,
    ChannelsModule,
    SearchModule,
    AdminModule,
    ModerationModule,
    ShowcaseModule,
    DiscoverModule,
    NotificationsModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
