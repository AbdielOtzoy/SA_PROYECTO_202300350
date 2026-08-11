import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { CATALOG_POOL } from '../common/database/database.tokens';
import type {
  Actor,
  CourseMessage,
  CourseStaffMessage,
  CsvRow,
  ListRequest,
  ProfessorMessage,
  RecordingMessage,
  RecordingRequest,
  SemesterMessage,
  SchoolMessage,
  VoteRequest,
  AuthorizationReply,
  PlaybackAuthorizationRequest,
  RecordingsReply,
} from './dto/catalog.dto';
import { toRecordingMessage, type RecordingRow } from './mappers/recording.mapper';

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}
interface CourseRow {
  id: string;
  code: string;
  name: string;
  school_id: string;
  credits: number;
  is_active: boolean;
}
interface SemesterRow {
  id: string;
  year: number;
  term: number;
  is_active: boolean;
}
interface ProfessorRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}
interface StaffRow {
  course_id: string;
  professor_id: string;
  role_type: string;
  course_code: string;
  professor_name: string;
  professor_email: string;
}

const schoolMessage = (row: SchoolRow): SchoolMessage => ({
  id: row.id,
  name: row.name,
  code: row.code,
  isActive: row.is_active,
});

const courseMessage = (row: CourseRow): CourseMessage => ({
  id: row.id,
  code: row.code,
  name: row.name,
  schoolId: row.school_id,
  credits: Number(row.credits || 0),
  isActive: row.is_active,
});

const semesterMessage = (row: SemesterRow): SemesterMessage => ({
  id: row.id,
  year: Number(row.year),
  term: Number(row.term),
  isActive: row.is_active,
});

const professorMessage = (row: ProfessorRow): ProfessorMessage => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  isActive: row.is_active,
});

const staffMessage = (row: StaffRow): CourseStaffMessage => ({
  courseId: row.course_id,
  professorId: row.professor_id,
  roleType: row.role_type,
  courseCode: row.course_code,
  professorName: row.professor_name,
  professorEmail: row.professor_email,
});

@Injectable()
export class CatalogRepository {
  constructor(@Inject(CATALOG_POOL) private readonly pool: Pool) {}

  async list(input: ListRequest): Promise<RecordingsReply> {
    const page = Math.max(1, Math.floor(Number(input.page || 1)));
    const pageSize = Math.min(10, Math.max(1, Math.floor(Number(input.page_size ?? input.pageSize ?? 10))));
    const offset = (page - 1) * pageSize;
    const result = await this.pool.query<RecordingRow & { total_count: number }>(
      `WITH filtered AS (
         SELECT published_catalog.*, COUNT(*) OVER()::int AS total_count
           FROM published_catalog
          WHERE ($1 = '' OR title ILIKE '%' || $1 || '%'
                      OR topic ILIKE '%' || $1 || '%'
                      OR course ILIKE '%' || $1 || '%'
                      OR course_code ILIKE '%' || $1 || '%')
            AND ($2 = '' OR school = $2)
            AND ($3 = '' OR course_code = $3)
            AND ($4 = '' OR semester = $4)
            AND ($5 = '' OR professor ILIKE '%' || $5 || '%')
       )
       SELECT *
         FROM filtered
        ORDER BY title, id
        LIMIT $6 OFFSET $7`,
      [
        input.query || '',
        input.school || '',
        input.course || '',
        input.semester || '',
        input.professor || '',
        pageSize,
        offset,
      ],
    );
    const total = Number(result.rows[0]?.total_count || 0);
    return {
      recordings: result.rows.map(toRecordingMessage),
      page,
      pageSize,
      total,
      totalPages: total ? Math.ceil(total / pageSize) : 0,
    };
  }

  async find(input: RecordingRequest): Promise<RecordingMessage | undefined> {
    const result = await this.pool.query<RecordingRow>('SELECT * FROM recording_detail WHERE id=$1', [input.id || '']);
    return result.rows[0] ? toRecordingMessage(result.rows[0]) : undefined;
  }

  async authorization(input: PlaybackAuthorizationRequest): Promise<AuthorizationReply> {
    const result = await this.pool.query<{ video_path: string }>(
      'SELECT video_path FROM recordings WHERE id=$1 AND is_published AND is_active',
      [input.recording_id || input.recordingId || ''],
    );
    return { allowed: result.rows.length > 0, videoPath: result.rows[0]?.video_path || '' };
  }

  async vote(input: VoteRequest): Promise<{ positives: number; total: number; recommendation: number }> {
    const recordingId = input.recording_id || input.recordingId || '';
    await this.pool.query(
      'INSERT INTO ratings(user_id,recording_id,vote) VALUES($1,$2,$3) ON CONFLICT(user_id,recording_id) DO UPDATE SET vote=EXCLUDED.vote',
      [input.user_id || input.userId || '', recordingId, !!input.vote],
    );
    const result = await this.pool.query<{ positives: number; total: number; recommendation: number | string }>(
      'SELECT COUNT(*) FILTER (WHERE vote)::int positives,COUNT(*)::int total,recommendation_percentage($1) recommendation FROM ratings WHERE recording_id=$1',
      [recordingId],
    );
    const row = result.rows[0];
    return {
      positives: Number(row?.positives || 0),
      total: Number(row?.total || 0),
      recommendation: Number(row?.recommendation || 0),
    };
  }

  async schools(): Promise<SchoolMessage[]> {
    const result = await this.pool.query<SchoolRow>('SELECT id,name,code,is_active FROM schools ORDER BY name');
    return result.rows.map(schoolMessage);
  }

  async courses(): Promise<CourseMessage[]> {
    const result = await this.pool.query<CourseRow>(
      'SELECT id,code,name,school_id,credits,is_active FROM courses ORDER BY code',
    );
    return result.rows.map(courseMessage);
  }

  async semesters(): Promise<SemesterMessage[]> {
    const result = await this.pool.query<SemesterRow>(
      'SELECT id,year,term,is_active FROM semesters ORDER BY year DESC,term DESC',
    );
    return result.rows.map(semesterMessage);
  }

  async professors(): Promise<ProfessorMessage[]> {
    const result = await this.pool.query<ProfessorRow>(
      'SELECT id,full_name,email,is_active FROM professors ORDER BY full_name',
    );
    return result.rows.map(professorMessage);
  }

  async staff(courseId = '', actor?: Actor): Promise<CourseStaffMessage[]> {
    const actorEmail = actor && !actor.roles.includes('admin') ? actor.email : '';
    const result = await this.pool.query<StaffRow>(
      `SELECT cs.course_id, cs.professor_id, cs.role_type,
              c.code course_code, p.full_name professor_name, p.email professor_email
         FROM course_staff cs
         JOIN courses c ON c.id = cs.course_id
         JOIN professors p ON p.id = cs.professor_id
        WHERE ($1 = '' OR cs.course_id = $1::uuid)
          AND ($2 = '' OR lower(p.email) = lower($2))
        ORDER BY c.code, p.full_name`,
      [courseId, actorEmail],
    );
    return result.rows.map(staffMessage);
  }

  async upsertSchool(input: Partial<SchoolMessage>): Promise<SchoolMessage> {
    const result = input.id
      ? await this.pool.query<SchoolRow>(
          'UPDATE schools SET name=$2,code=$3,is_active=true WHERE id=$1 RETURNING id,name,code,is_active',
          [input.id, input.name, input.code],
        )
      : await this.pool.query<SchoolRow>(
          'INSERT INTO schools(name,code) VALUES($1,$2) RETURNING id,name,code,is_active',
          [input.name, input.code],
        );
    return schoolMessage(result.rows[0]);
  }

  async upsertCourse(input: Partial<CourseMessage>): Promise<CourseMessage> {
    const result = input.id
      ? await this.pool.query<CourseRow>(
          'UPDATE courses SET code=$2,name=$3,school_id=$4,credits=$5,is_active=true WHERE id=$1 RETURNING id,code,name,school_id,credits,is_active',
          [input.id, input.code, input.name, input.schoolId, input.credits || 0],
        )
      : await this.pool.query<CourseRow>(
          'INSERT INTO courses(code,name,school_id,credits) VALUES($1,$2,$3,$4) RETURNING id,code,name,school_id,credits,is_active',
          [input.code, input.name, input.schoolId, input.credits || 0],
        );
    return courseMessage(result.rows[0]);
  }

  async upsertSemester(input: Partial<SemesterMessage>): Promise<SemesterMessage> {
    const result = input.id
      ? await this.pool.query<SemesterRow>(
          'UPDATE semesters SET year=$2,term=$3,is_active=true WHERE id=$1 RETURNING id,year,term,is_active',
          [input.id, input.year, input.term],
        )
      : await this.pool.query<SemesterRow>(
          'INSERT INTO semesters(year,term) VALUES($1,$2) RETURNING id,year,term,is_active',
          [input.year, input.term],
        );
    return semesterMessage(result.rows[0]);
  }

  async upsertProfessor(input: Partial<ProfessorMessage>): Promise<ProfessorMessage> {
    const result = input.id
      ? await this.pool.query<ProfessorRow>(
          'UPDATE professors SET full_name=$2,email=$3,is_active=true WHERE id=$1 RETURNING id,full_name,email,is_active',
          [input.id, input.fullName, input.email],
        )
      : await this.pool.query<ProfessorRow>(
          'INSERT INTO professors(full_name,email) VALUES($1,$2) RETURNING id,full_name,email,is_active',
          [input.fullName, input.email],
        );
    return professorMessage(result.rows[0]);
  }

  async archive(entity: string, id: string): Promise<void> {
    const statements: Record<string, string> = {
      school: 'UPDATE schools SET is_active=false WHERE id=$1',
      course: 'UPDATE courses SET is_active=false WHERE id=$1',
      semester: 'UPDATE semesters SET is_active=false WHERE id=$1',
      professor: 'UPDATE professors SET is_active=false WHERE id=$1',
      recording: 'UPDATE recordings SET is_published=false,is_active=false WHERE id=$1',
    };
    const statement = statements[entity];
    if (!statement) throw new Error(`Entidad no archivables: ${entity}`);
    await this.pool.query(statement, [id]);
  }

  async assignStaff(
    courseId: string,
    professorId: string,
    roleType: string,
    actorEmail: string,
  ): Promise<CourseStaffMessage> {
    await this.pool.query('CALL sp_assign_course_staff($1,$2,$3,$4)', [courseId, professorId, roleType, actorEmail]);
    const rows = await this.staff(courseId);
    const assignment = rows.find((row) => row.professorId === professorId);
    if (!assignment) throw new Error('No se pudo recuperar la asignación creada');
    return assignment;
  }

  async revokeStaff(courseId: string, professorId: string): Promise<void> {
    await this.pool.query('CALL sp_revoke_course_staff($1,$2)', [courseId, professorId]);
  }

  async assertActorCanManageRecordingRows(rows: CsvRow[], actor: Actor): Promise<void> {
    if (actor.roles.includes('admin')) return;
    const codes = [...new Set(rows.map((row) => String(row.course_code || '').trim()).filter(Boolean))];
    const allowedRoles = actor.roles.includes('teacher') ? ['professor'] : ['assistant'];
    const result = await this.pool.query<{ code: string }>(
      `SELECT DISTINCT c.code
         FROM course_staff cs
         JOIN courses c ON c.id = cs.course_id
         JOIN professors p ON p.id = cs.professor_id
        WHERE lower(p.email)=lower($1)
          AND cs.role_type = ANY($2::text[])
          AND c.code = ANY($3::text[])`,
      [actor.email, allowedRoles, codes],
    );
    if (result.rows.length !== codes.length) throw new Error('El usuario no tiene asignados todos los cursos del CSV');
  }

  async importCatalog(rows: CsvRow[]): Promise<void> {
    await this.pool.query('CALL sp_import_catalog_csv($1::jsonb)', [JSON.stringify(rows)]);
  }

  async importRecordings(rows: CsvRow[]): Promise<void> {
    await this.pool.query('CALL sp_import_recordings_csv($1::jsonb)', [JSON.stringify(rows)]);
  }
}
