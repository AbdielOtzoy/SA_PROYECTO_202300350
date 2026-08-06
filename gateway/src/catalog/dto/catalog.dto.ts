import type { ListRecordingsReply, RatingReply, RecordingReply } from '../../common/grpc/grpc.types';

export interface CatalogQuery {
  q?: string;
  school?: string;
  course?: string;
  semester?: string;
}

export interface VoteBody {
  vote?: boolean;
}

export type { ListRecordingsReply, RatingReply, RecordingReply };
