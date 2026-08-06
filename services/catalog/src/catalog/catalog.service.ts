import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { grpcError } from '../common/grpc/grpc-errors';
import type {
  AuthorizationReply,
  ListRequest,
  RecordingsReply,
  RecordingReply,
  RecordingRequest,
  RatingReply,
  VoteRequest,
  PlaybackAuthorizationRequest,
} from './dto/catalog.dto';
import { CatalogRepository } from './catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async list(input: ListRequest): Promise<RecordingsReply> {
    return { recordings: await this.repository.list(input) };
  }

  async detail(input: RecordingRequest): Promise<RecordingReply> {
    const recording = await this.repository.find(input);
    if (!recording) throw grpcError(GrpcStatus.NOT_FOUND, 'Grabación no publicada');
    return { recording };
  }

  authorization(input: PlaybackAuthorizationRequest): Promise<AuthorizationReply> {
    return this.repository.authorization(input);
  }

  async vote(input: VoteRequest): Promise<RatingReply> {
    return this.repository.vote(input);
  }
}
