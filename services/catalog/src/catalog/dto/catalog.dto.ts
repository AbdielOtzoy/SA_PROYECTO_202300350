export interface ListRequest {
  query?: string;
  school?: string;
  course?: string;
  semester?: string;
}

export interface RecordingRequest {
  id?: string;
}

export interface PlaybackAuthorizationRequest {
  recording_id?: string;
  recordingId?: string;
  user_id?: string;
  userId?: string;
}

export interface VoteRequest {
  user_id?: string;
  userId?: string;
  recording_id?: string;
  recordingId?: string;
  vote?: boolean;
}

export interface RecordingMessage {
  id: string;
  title: string;
  course: string;
  courseCode: string;
  school: string;
  semester: string;
  unit: string;
  topic: string;
  videoPath: string;
  recommendation: number;
}

export interface AuthorizationReply {
  allowed: boolean;
  videoPath: string;
}
export interface RecordingsReply {
  recordings: RecordingMessage[];
}
export interface RecordingReply {
  recording: RecordingMessage;
}
export interface RatingReply {
  recommendation: number;
  positives: number;
  total: number;
}
