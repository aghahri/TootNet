# Socket.IO Redis scaling (multi-node)

When running multiple backend nodes behind a load balancer, enable the Socket.IO Redis adapter so realtime events (e.g. `group_message`, `channel_message`) are broadcast across all nodes.

## Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | When adapter enabled | Redis connection URL (e.g. `redis://172.16.244.4:6379`) |
| `SOCKET_IO_REDIS_ENABLED` | No | Set to `true` to use Redis adapter. Omit or `false` = single-node mode. |

## Behaviour

- **Single-node** (`SOCKET_IO_REDIS_ENABLED` not `true` or no `REDIS_URL`): default `IoAdapter`; app runs as before.
- **Multi-node**: `RedisIoAdapter` connects to Redis (pub/sub); `server.to(room).emit(...)` is published to Redis and delivered to clients on any node.

Gateway logic (auth, permissions, services) is unchanged; Redis is only used for cross-node event propagation.

## Testing cross-node delivery

1. Set on both nodes: `REDIS_URL=redis://172.16.244.4:6379`, `SOCKET_IO_REDIS_ENABLED=true`.
2. Restart both backends; ensure WebSocket path (e.g. `/socket.io/`) is reachable via nginx to both.
3. Connect client A to the API (nginx); note which node it hits (e.g. by response header or log).
4. Connect client B; prefer it lands on the other node (e.g. use two browsers or different IPs so nginx may balance differently).
5. Both join the same group/channel room (same `groupId` / `channelId`).
6. Send a message from client A; client B should receive the same event without being on the same backend node.
