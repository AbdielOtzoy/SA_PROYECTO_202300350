import { Injectable } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import { join } from 'node:path';
import { AppConfig } from '../config/app-config';
import { GrpcErrorMapper } from './grpc-error';
import type { ClientName, DynamicGrpcClient } from './grpc.types';

type DynamicServiceConstructor = new (address: string, credentials: grpc.ChannelCredentials) => DynamicGrpcClient;

type UnaryCallback<TResponse> = (error: grpc.ServiceError | null, response: TResponse) => void;

type UnaryMethod<TRequest, TResponse> = (
  request: TRequest,
  metadata: grpc.Metadata,
  options: grpc.CallOptions,
  callback: UnaryCallback<TResponse>,
) => void;

@Injectable()
export class GrpcClientsService {
  readonly identity: DynamicGrpcClient;
  readonly catalog: DynamicGrpcClient;
  readonly playback: DynamicGrpcClient;
  readonly analytics: DynamicGrpcClient;
  readonly notifications: DynamicGrpcClient;

  constructor(private readonly config: AppConfig) {
    this.identity = this.create('identity', 'IdentityService', 'IDENTITY_GRPC_ADDRESS', 'identity:50051');
    this.catalog = this.create('catalog', 'CatalogService', 'CATALOG_GRPC_ADDRESS', 'catalog:50052');
    this.playback = this.create('playback', 'PlaybackService', 'PLAYBACK_GRPC_ADDRESS', 'playback:50053');
    this.analytics = this.create('analytics', 'AnalyticsService', 'ANALYTICS_GRPC_ADDRESS', 'analytics:50054');
    this.notifications = this.create(
      'notifications',
      'NotificationService',
      'NOTIFICATIONS_GRPC_ADDRESS',
      'notifications:50055',
    );
  }

  get(name: ClientName): DynamicGrpcClient {
    return this[name];
  }

  private create(protoName: string, serviceName: string, addressEnv: string, fallback: string): DynamicGrpcClient {
    const definition = loader.loadSync(join(this.config.protoDir, `${protoName}.proto`), {
      keepCase: true,
      defaults: true,
      oneofs: true,
    });
    const loaded = grpc.loadPackageDefinition(definition) as grpc.GrpcObject;
    const namespace = loaded.yousac as grpc.GrpcObject;
    const domain = namespace[protoName] as grpc.GrpcObject;
    const version = domain.v1 as grpc.GrpcObject;
    const Constructor = version[serviceName] as DynamicServiceConstructor;
    return new Constructor(this.config.grpcAddress(addressEnv, fallback), grpc.credentials.createInsecure());
  }
}

@Injectable()
export class GrpcCallService {
  constructor(
    private readonly clients: GrpcClientsService,
    private readonly config: AppConfig,
    private readonly errors: GrpcErrorMapper,
  ) {}

  unary<TRequest, TResponse>(
    clientName: ClientName,
    methodName: string,
    request: TRequest,
    token?: string,
  ): Promise<TResponse> {
    const client = this.clients.get(clientName);
    const method = client[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Método gRPC no disponible: ${clientName}.${methodName}`);
    }
    const call = method as UnaryMethod<TRequest, TResponse>;
    const metadata = this.metadata(token);
    return new Promise<TResponse>((resolve, reject) => {
      try {
        call.call(
          client,
          request,
          metadata,
          { deadline: new Date(Date.now() + this.config.grpcTimeoutMs) },
          (error, response) => (error ? reject(this.errors.toHttp(error)) : resolve(response)),
        );
      } catch (error: unknown) {
        reject(this.errors.toHttp(error));
      }
    });
  }

  stream<TRequest, TChunk>(
    clientName: ClientName,
    methodName: string,
    request: TRequest,
    token: string,
  ): grpc.ClientReadableStream<TChunk> {
    const client = this.clients.get(clientName);
    const method = client[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Método gRPC no disponible: ${clientName}.${methodName}`);
    }
    const call = method as unknown as (
      request: TRequest,
      metadata: grpc.Metadata,
      options: grpc.CallOptions,
    ) => grpc.ClientReadableStream<TChunk>;
    return call.call(client, request, this.metadata(token), {
      deadline: new Date(Date.now() + this.config.grpcTimeoutMs),
    });
  }

  metadata(token?: string): grpc.Metadata {
    const metadata = new grpc.Metadata();
    if (token) metadata.set('authorization', `Bearer ${token}`);
    return metadata;
  }
}
