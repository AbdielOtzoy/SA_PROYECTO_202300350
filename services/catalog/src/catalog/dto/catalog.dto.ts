export interface ListRequest {
  query?: string;
  school?: string;
  course?: string;
  semester?: string;
  page?: number;
  page_size?: number;
  pageSize?: number;
  professor?: string;
  user_id?: string;
  userId?: string;
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
  professor: string;
  courseId?: string;
  lectureDate?: string;
  positives?: number;
  totalVotes?: number;
  hasUserVote?: boolean;
  userVote?: boolean;
  views?: number;
}

export interface AuthorizationReply {
  allowed: boolean;
  videoPath: string;
}
export interface RecordingsReply {
  recordings: RecordingMessage[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PublishedRecordingMessage {
  recording_id: string;
  title: string;
  course_id: string;
  course_code: string;
  course: string;
}
export interface RecordingReply {
  recording: RecordingMessage;
}
export interface RatingReply {
  recommendation: number;
  positives: number;
  total: number;
}

export interface SchoolMessage {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface CourseMessage {
  id: string;
  code: string;
  name: string;
  schoolId: string;
  credits: number;
  isActive: boolean;
}

export interface SemesterMessage {
  id: string;
  year: number;
  term: number;
  isActive: boolean;
}

export interface ProfessorMessage {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
}

export interface CourseStaffMessage {
  courseId: string;
  professorId: string;
  roleType: string;
  courseCode: string;
  professorName: string;
  professorEmail: string;
}

export interface CsvRow {
  [key: string]: string | number | boolean | null;
}

export interface Actor {
  id: string;
  email: string;
  roles: string[];
}
