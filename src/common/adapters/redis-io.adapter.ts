import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter that uses Redis for pub/sub so that events are
 * broadcast across multiple backend nodes. Use when running behind
 * a load balancer with SOCKET_IO_REDIS_ENABLED=true and REDIS_URL set.
 */
export class RedisIoAdapter extends IoAdapter {
  private redisAdapter: ReturnType<typeof createAdapter> | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  /**
   * Connect to Redis and create the adapter. Call once before useWebSocketAdapter().
   * @param redisUrl e.g. redis://172.16.244.4:6379
   */
  async connectToRedis(redisUrl: string): Promise<void> {
    this.pubClient = createClient({ url: redisUrl });
    this.subClient = this.pubClient.duplicate() as RedisClientType;
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.redisAdapter = createAdapter(this.pubClient, this.subClient);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.redisAdapter) {
      server.adapter(this.redisAdapter);
    }
    return server;
  }
}
