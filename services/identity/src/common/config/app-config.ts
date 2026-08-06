import { Injectable } from '@nestjs/common';
import { join } from 'node:path';

@Injectable()
export class AppConfig {
  get protoDir(): string {
    return process.env.PROTO_DIR || join(process.cwd(), 'proto');
  }
  get databaseUrl(): string {
    return process.env.IDENTITY_DATABASE_URL || '';
  }
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET || '';
    if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
    return secret;
  }
  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '60m';
  }
  get grpcBind(): string {
    return process.env.IDENTITY_GRPC_BIND || '0.0.0.0:50051';
  }
  get emailDomains(): string[] {
    return (process.env.ALLOWED_EMAIL_DOMAINS || 'ingenieria.usac.edu.gt,ing.usac.edu.gt')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }
}
