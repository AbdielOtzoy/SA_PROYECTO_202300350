import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type { ListRecordingsReply, RatingReply, RecordingReply } from '../common/grpc/grpc.types';
import type { CatalogQuery, VoteBody } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
  ) {}

  list(request: Request, query: CatalogQuery): Promise<ListRecordingsReply> {
    const current = this.session.require(request);
    return this.grpc.unary(
      'catalog',
      'ListRecordings',
      {
        query: query.q || '',
        school: query.school || '',
        course: query.course || '',
        semester: query.semester || '',
      },
      current.token,
    );
  }

  detail(request: Request, id: string): Promise<RecordingReply> {
    const current = this.session.require(request);
    return this.grpc.unary('catalog', 'GetRecording', { id }, current.token);
  }

  vote(request: Request, recordingId: string, body: VoteBody): Promise<RatingReply> {
    const current = this.session.require(request);
    return this.grpc.unary(
      'catalog',
      'Vote',
      {
        user_id: current.claims.sub,
        recording_id: recordingId,
        vote: !!body.vote,
      },
      current.token,
    );
  }
}
