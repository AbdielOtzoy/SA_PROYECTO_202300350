import type { CheckpointReply, HistoryReply, PlaybackReply, VideoChunk } from '../../common/grpc/grpc.types';

export interface CheckpointBody {
  seconds?: number;
  event_type?: string;
  eventType?: string;
}

export type { CheckpointReply, HistoryReply, PlaybackReply, VideoChunk };
