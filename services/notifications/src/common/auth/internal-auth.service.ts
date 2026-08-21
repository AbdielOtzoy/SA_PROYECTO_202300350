import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus, Metadata } from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app-config';

@Injectable()
export class InternalAuthService {
  constructor(private readonly config: AppConfig) {}

  verify(metadata: Metadata): jwt.JwtPayload {
    const value = metadata.get('authorization')[0];
    if (typeof value !== 'string' || !/^Bearer\s+.+/i.test(value)) {
      throw new RpcException({ code: GrpcStatus.UNAUTHENTICATED, details: 'JWT interno requerido' });
    }
    try {
      return jwt.verify(value.replace(/^Bearer\s+/i, ''), this.config.jwtSecret) as jwt.JwtPayload;
    } catch {
      throw new RpcException({ code: GrpcStatus.UNAUTHENTICATED, details: 'JWT inválido' });
    }
  }

  denied(details: string): never {
    throw new RpcException({ code: GrpcStatus.PERMISSION_DENIED, details });
  }
}
