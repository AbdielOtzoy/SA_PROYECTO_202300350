import type { RecordingMessage } from '../dto/catalog.dto';

export interface RecordingRow {
  id: string;
  title: string;
  course: string;
  course_code: string;
  school: string;
  semester: string;
  unit: string;
  topic: string;
  video_path: string;
  professor?: string;
  recommendation: number | string | null;
  course_id?: string;
  lecture_date?: string | Date | null;
  positives?: number | string;
  total_votes?: number | string;
  has_user_vote?: boolean;
  user_vote?: boolean;
  views?: number | string;
}

export function toRecordingMessage(row: RecordingRow): RecordingMessage {
  return {
    id: row.id,
    title: row.title,
    course: row.course,
    courseCode: row.course_code,
    school: row.school,
    semester: row.semester,
    unit: row.unit,
    topic: row.topic,
    videoPath: row.video_path,
    professor: row.professor || '',
    recommendation: Number(row.recommendation || 0),
    courseId: row.course_id || '',
    lectureDate: row.lecture_date ? String(row.lecture_date) : '',
    positives: Number(row.positives || 0),
    totalVotes: Number(row.total_votes || 0),
    hasUserVote: row.has_user_vote === true,
    userVote: row.user_vote === true,
    views: Number(row.views || 0),
  };
}
