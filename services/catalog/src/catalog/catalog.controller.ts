import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { InternalAuthService } from '../common/auth/internal-auth.service';
import type { ListRequest, PlaybackAuthorizationRequest, RecordingRequest, VoteRequest } from './dto/catalog.dto';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly auth: InternalAuthService,
  ) {}

  @GrpcMethod('CatalogService', 'ListRecordings')
  list(data: ListRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.list(data);
  }

  @GrpcMethod('CatalogService', 'GetRecording')
  detail(data: RecordingRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.detail(data);
  }

  @GrpcMethod('CatalogService', 'CanPlay')
  canPlay(data: PlaybackAuthorizationRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.authorization(data);
  }

  @GrpcMethod('CatalogService', 'Vote')
  vote(data: VoteRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.vote(data);
  }
}
