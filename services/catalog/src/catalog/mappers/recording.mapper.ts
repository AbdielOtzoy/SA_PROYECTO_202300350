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
  };
}
