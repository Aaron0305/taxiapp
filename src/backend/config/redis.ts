// Placeholder para configuración de Redis (futuro: cache de ubicaciones GPS)
// Por ahora no se usa Redis, pero la estructura queda lista.

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// TODO: Implementar cliente Redis cuando se necesite cache de ubicaciones en tiempo real
export const redisEnabled = false;
