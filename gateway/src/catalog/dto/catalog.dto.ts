import type { ListRecordingsReply, RatingReply, RecordingReply } from '../../common/grpc/grpc.types';

export interface CatalogQuery {
  q?: string;
  school?: string;
  course?: string;
  semester?: string;
  professor?: string;
  topic?: string;
  page?: string | number;
  page_size?: string | number;
}

export interface VoteBody {
  vote?: boolean;
}

export type { ListRecordingsReply, RatingReply, RecordingReply };
