import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type { CheckpointReply, HistoryReply, PlaybackReply } from '../common/grpc/grpc.types';
import type { CheckpointBody } from './dto/playback.dto';

@Injectable()
export class PlaybackService {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
  ) {}

  async playback(request: Request, recordingId: string): Promise<PlaybackReply> {
    const current = this.session.require(request);
    const reply = await this.grpc.unary<{ user_id: string; recording_id: string }, PlaybackReply>(
      'playback',
      'GetPlayback',
      {
        user_id: current.claims.sub,
        recording_id: recordingId,
      },
      current.token,
    );
    void this.grpc
      .unary(
        'analytics',
        'RecordView',
        {
          user_id: current.claims.sub,
          recording_id: recordingId,
        },
        current.token,
      )
      .catch(() => undefined);
    return reply;
  }

  checkpoint(request: Request, recordingId: string, body: CheckpointBody): Promise<CheckpointReply> {
    const current = this.session.require(request);
    return this.grpc.unary<
      { user_id: string; recording_id: string; seconds: number; event_type: string },
      CheckpointReply
    >(
      'playback',
      'SaveCheckpoint',
      {
        user_id: current.claims.sub,
        recording_id: recordingId,
        seconds: Number(body.seconds),
        event_type: body.event_type || body.eventType || 'checkpoint',
      },
      current.token,
    );
  }

  history(request: Request): Promise<HistoryReply> {
    const current = this.session.require(request);
    return this.grpc.unary<{ user_id: string }, HistoryReply>(
      'playback',
      'GetHistory',
      { user_id: current.claims.sub },
      current.token,
    );
  }
}
