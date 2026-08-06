import { Injectable } from '@nestjs/common';
import { join } from 'node:path';

@Injectable()
export class AppConfig {
  get protoDir(): string {
    return process.env.PROTO_DIR || join(process.cwd(), 'proto');
  }
  get databaseUrl(): string {
    return process.env.CATALOG_DATABASE_URL || '';
  }
  get grpcBind(): string {
    return process.env.CATALOG_GRPC_BIND || '0.0.0.0:50052';
  }
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET || '';
    if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
    return secret;
  }
}
