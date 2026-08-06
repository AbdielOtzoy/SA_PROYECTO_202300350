import { Module } from '@nestjs/common';
import { AppConfig } from './config/app-config';
import { SessionService } from './auth/session.service';
import { GrpcClientsService, GrpcCallService } from './grpc/grpc.client';
import { GrpcErrorMapper } from './grpc/grpc-error';

@Module({
  providers: [AppConfig, SessionService, GrpcClientsService, GrpcCallService, GrpcErrorMapper],
  exports: [AppConfig, SessionService, GrpcClientsService, GrpcCallService, GrpcErrorMapper],
})
export class CommonModule {}
