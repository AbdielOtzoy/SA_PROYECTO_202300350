import { Controller, Get, Logger, Param, Post, Put, Body, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GrpcCallService } from '../common/grpc/grpc.client';
import { GrpcErrorMapper } from '../common/grpc/grpc-error';
import { SessionService } from '../common/auth/session.service';
import type { VideoChunk } from '../common/grpc/grpc.types';
import { PlaybackService } from './playback.service';
import type { CheckpointBody } from './dto/playback.dto';

@Controller('api/playback')
export class PlaybackController {
  private readonly logger = new Logger(PlaybackController.name);

  constructor(
    private readonly playback: PlaybackService,
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
    private readonly errors: GrpcErrorMapper,
  ) {}

  @Post(':id')
  start(@Req() request: Request, @Param('id') recordingId: string) {
    return this.playback.playback(request, recordingId);
  }

  @Put(':id/checkpoint')
  checkpoint(@Req() request: Request, @Param('id') recordingId: string, @Body() body: CheckpointBody) {
    return this.playback.checkpoint(request, recordingId, body);
  }

  @Get(':id/stream')
  stream(@Req() request: Request, @Res() response: Response, @Param('id') recordingId: string): void {
    const current = this.session.require(request);
    const call = this.grpc.stream<{ user_id: string; recording_id: string }, VideoChunk>(
      'playback',
      'StreamVideo',
      { user_id: current.claims.sub, recording_id: recordingId },
      current.token,
    );
    const chunks: Buffer[] = [];
    let failed = false;
    call.on('data', (chunk: VideoChunk) => chunks.push(Buffer.from(chunk.data)));
    call.on('error', (error: unknown) => {
      failed = true;
      this.logger.warn(`StreamVideo gRPC error: ${this.grpcErrorMessage(error)}`);
      if (!response.headersSent) response.status(this.errors.httpStatus(error)).end();
    });
    call.on('end', () => {
      if (!failed && !response.headersSent)
        this.sendVideo(response, Buffer.concat(chunks), String(request.headers.range || ''));
    });
  }

  private sendVideo(response: Response, video: Buffer, requestedRange: string): void {
    const total = video.length;
    const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
    if (match) {
      const start = match[1] === '' ? 0 : Number(match[1]);
      const end = match[2] === '' ? total - 1 : Math.min(Number(match[2]), total - 1);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= total) {
        response.status(416).set('Content-Range', `bytes */${total}`).end();
        return;
      }
      response
        .status(206)
        .set({
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Range': `bytes ${start}-${end}/${total}`,
        })
        .end(video.subarray(start, end + 1));
      return;
    }
    response
      .status(200)
      .set({
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Length': total,
      })
      .end(video);
  }

  private grpcErrorMessage(error: unknown): string {
    if (typeof error !== 'object' || error === null) return String(error);
    const value = error as { code?: unknown; details?: unknown; message?: unknown };
    return `${String(value.code)} ${String(value.details || value.message || '')}`;
  }
}

@Controller('api')
export class HistoryController {
  constructor(private readonly playback: PlaybackService) {}

  @Get('history')
  history(@Req() request: Request) {
    return this.playback.history(request);
  }
}
