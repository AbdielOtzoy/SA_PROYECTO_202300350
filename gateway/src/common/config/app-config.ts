import { Injectable } from '@nestjs/common';
import { join } from 'node:path';

@Injectable()
export class AppConfig {
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET || '';
    if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
    return secret;
  }

  get protoDir(): string {
    return process.env.PROTO_DIR || join(process.cwd(), 'proto');
  }

  get tlsDir(): string {
    return process.env.TLS_DIR || join(process.cwd(), 'tls');
  }

  get gatewayPort(): number {
    return Number(process.env.GATEWAY_PORT || 443);
  }

  get frontendUrl(): string {
    return process.env.FRONTEND_URL || 'https://localhost:3000';
  }

  get oauthSuccessUrl(): string {
    return process.env.OAUTH_SUCCESS_URL || `${this.frontendUrl}/catalogo`;
  }

  get oauthFailureUrl(): string {
    return process.env.OAUTH_FAILURE_URL || `${this.frontendUrl}/?oauth=error`;
  }

  get grpcTimeoutMs(): number {
    return Number(process.env.GRPC_TIMEOUT_MS || 5000);
  }

  grpcAddress(service: string, fallback: string): string {
    return process.env[service] || fallback;
  }
}
