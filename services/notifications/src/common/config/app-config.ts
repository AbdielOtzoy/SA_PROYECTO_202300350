import { Injectable } from '@nestjs/common';
import { join } from 'node:path';

@Injectable()
export class AppConfig {
  get protoDir(): string {
    return process.env.PROTO_DIR || join(process.cwd(), 'proto');
  }
  get databaseUrl(): string {
    return process.env.NOTIFICATION_DATABASE_URL || '';
  }
  get grpcBind(): string {
    return process.env.NOTIFICATIONS_GRPC_BIND || '0.0.0.0:50055';
  }
  get mailHost(): string {
    return process.env.MAILPIT_HOST || 'mailpit';
  }
  get mailPort(): number {
    return Number(process.env.MAILPIT_PORT || 1025);
  }
  get notificationPollIntervalMs(): number {
    return Math.max(1000, Number(process.env.NOTIFICATION_POLL_INTERVAL_MS || 30000));
  }
  get notificationBatchSize(): number {
    return Math.max(1, Math.min(100, Number(process.env.NOTIFICATION_BATCH_SIZE || 100)));
  }
  get notificationMaxAttempts(): number {
    return Math.max(1, Number(process.env.NOTIFICATION_MAX_ATTEMPTS || 4));
  }
  get mailSendTimeoutMs(): number {
    return Math.max(1000, Number(process.env.MAIL_SEND_TIMEOUT_MS || 10000));
  }
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET || '';
    if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
    return secret;
  }
}
