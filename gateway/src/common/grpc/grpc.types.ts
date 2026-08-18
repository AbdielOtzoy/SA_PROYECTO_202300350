import type * as grpc from '@grpc/grpc-js';

export type ClientName = 'identity' | 'catalog' | 'playback' | 'analytics' | 'notifications';

export type DynamicGrpcClient = grpc.Client & Record<string, unknown>;

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  fullName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserMessage {
  id: string;
  email: string;
  full_name?: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
  is_active?: boolean;
  isActive?: boolean;
}

export interface AuthReply {
  token: string;
  user: UserMessage;
  created?: boolean;
}

export interface RecordingMessage {
  id: string;
  title: string;
  course: string;
  course_code?: string;
  courseCode?: string;
  school: string;
  semester: string;
  unit: string;
  topic: string;
  video_path?: string;
  videoPath?: string;
  recommendation: number;
  professor?: string;
  course_id?: string;
  courseId?: string;
  lecture_date?: string;
  lectureDate?: string;
  positives?: number;
  total_votes?: number;
  totalVotes?: number;
  has_user_vote?: boolean;
  hasUserVote?: boolean;
  user_vote?: boolean;
  userVote?: boolean;
  views?: number;
}

export interface AnalyticsRecordingMessage {
  recording_id: string;
  title: string;
  course_id: string;
  course: string;
  course_code: string;
  school: string;
  semester: string;
  unit: string;
  topic: string;
  video_path: string;
  recommendation: number;
  positives: number;
  total_votes: number;
  has_user_vote: boolean;
  user_vote: boolean;
  professor: string;
  views: number;
}

export interface AnalyticsCatalogPageReply {
  recordings: AnalyticsRecordingMessage[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ListRecordingsReply {
  recordings: RecordingMessage[];
  page?: number;
  page_size?: number;
  pageSize?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
}

export interface RecordingReply {
  recording: RecordingMessage;
}

export interface RatingReply {
  recommendation: number;
  positives: number;
  total: number;
}

export interface PlaybackReply {
  stream_url: string;
  checkpoint_seconds: number;
}

export interface CheckpointReply {
  seconds: number;
}

export interface HistoryItem {
  recording_id: string;
  started_at: string;
  last_position_seconds: number;
}

export interface HistoryReply {
  items: HistoryItem[];
}

export interface VideoChunk {
  data: Buffer | Uint8Array;
}

export interface NotificationReply {
  accepted: boolean;
}

export interface EnrollmentMessage {
  course_id?: string;
  courseId?: string;
  semester_id?: string;
  semesterId?: string;
  status?: string;
  credentials?: string;
}

export interface EnrollmentsReply {
  enrollments: EnrollmentMessage[];
}

export interface CourseMessage {
  id: string;
  code: string;
  name: string;
  school_id?: string;
  schoolId?: string;
  credits?: number;
  is_active?: boolean;
  isActive?: boolean;
}

export interface CoursesReply {
  courses: CourseMessage[];
}

export interface SemesterMessage {
  id: string;
  year: number;
  term: number;
  is_active?: boolean;
  isActive?: boolean;
}

export interface SemestersReply {
  semesters: SemesterMessage[];
}

export interface EnrollmentView {
  user_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  semester_id: string;
  semester: string;
  semester_year: number;
  semester_term: number;
  status: string;
  credentials: string;
}

export interface AuthProfile {
  email: string;
  name: string;
  verified: boolean;
}
