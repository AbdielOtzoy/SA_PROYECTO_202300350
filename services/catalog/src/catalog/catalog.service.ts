import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { grpcError } from '../common/grpc/grpc-errors';
import type {
  Actor,
  AuthorizationReply,
  CourseMessage,
  CourseStaffMessage,
  ListRequest,
  ProfessorMessage,
  RatingReply,
  RecordingReply,
  RecordingRequest,
  RecordingsReply,
  SchoolMessage,
  SemesterMessage,
  VoteRequest,
  PlaybackAuthorizationRequest,
} from './dto/catalog.dto';
import { booleanValue, csvRows, integer, required } from './csv';
import { CatalogRepository } from './catalog.repository';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const institutionalEmailPattern = /^[^\s@]+@(ingenieria\.usac\.edu\.gt|ing\.usac\.edu\.gt)$/i;

function unwrap<T>(input: T & Record<string, unknown>, key: string): T {
  return (input?.[key] as T) || input;
}

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async list(input: ListRequest): Promise<RecordingsReply> {
    return this.repository.list(input);
  }

  async detail(input: RecordingRequest): Promise<RecordingReply> {
    const recording = await this.repository.find(input);
    if (!recording) throw grpcError(GrpcStatus.NOT_FOUND, 'Grabación no publicada');
    return { recording };
  }

  authorization(input: PlaybackAuthorizationRequest): Promise<AuthorizationReply> {
    return this.repository.authorization(input);
  }

  vote(input: VoteRequest): Promise<RatingReply> {
    return this.repository.vote(input);
  }

  schools(): Promise<SchoolMessage[]> {
    return this.repository.schools();
  }
  courses(): Promise<CourseMessage[]> {
    return this.repository.courses();
  }
  semesters(): Promise<SemesterMessage[]> {
    return this.repository.semesters();
  }
  professors(): Promise<ProfessorMessage[]> {
    return this.repository.professors();
  }
  staff(courseId: string, actor: Actor): Promise<CourseStaffMessage[]> {
    return this.repository.staff(courseId, actor);
  }

  async upsertSchool(input: unknown): Promise<SchoolMessage> {
    const school = unwrap(input as Record<string, unknown>, 'school') as Record<string, unknown>;
    return this.repository.upsertSchool({
      id: this.optionalString(school.id),
      name: this.requiredText(school.name, 'nombre'),
      code: this.requiredText(school.code, 'código'),
    });
  }

  async upsertCourse(input: unknown): Promise<CourseMessage> {
    const course = unwrap(input as Record<string, unknown>, 'course') as Record<string, unknown>;
    return this.repository.upsertCourse({
      id: this.optionalString(course.id),
      code: this.requiredText(course.code, 'código'),
      name: this.requiredText(course.name, 'nombre'),
      schoolId: this.requiredUuid(course.school_id || course.schoolId, 'escuela'),
      credits: Number(course.credits || 0),
    });
  }

  async upsertSemester(input: unknown): Promise<SemesterMessage> {
    const semester = unwrap(input as Record<string, unknown>, 'semester') as Record<string, unknown>;
    const year = Number(semester.year);
    const term = Number(semester.term);
    if (!Number.isInteger(year) || !Number.isInteger(term) || ![1, 2].includes(term)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Semestre inválido');
    }
    return this.repository.upsertSemester({
      id: this.optionalString(semester.id),
      year,
      term,
    });
  }

  async upsertProfessor(input: unknown): Promise<ProfessorMessage> {
    const professor = unwrap(input as Record<string, unknown>, 'professor') as Record<string, unknown>;
    const email = this.requiredText(professor.email, 'correo');
    if (!emailPattern.test(email) || !institutionalEmailPattern.test(email)) {
      throw grpcError(
        GrpcStatus.INVALID_ARGUMENT,
        'El correo debe pertenecer a @ingenieria.usac.edu.gt o @ing.usac.edu.gt',
      );
    }
    return this.repository.upsertProfessor({
      id: this.optionalString(professor.id),
      fullName: this.requiredText(professor.full_name || professor.fullName, 'nombre'),
      email,
    });
  }

  archive(input: { entity?: string; id?: string }): Promise<void> {
    const entity = String(input.entity || '')
      .trim()
      .toLowerCase();
    const id = this.requiredUuid(input.id, 'identificador');
    if (!['school', 'course', 'semester', 'professor', 'recording'].includes(entity)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Entidad académica inválida');
    }
    return this.repository.archive(entity, id);
  }

  async assignStaff(
    input: {
      course_id?: string;
      courseId?: string;
      professor_id?: string;
      professorId?: string;
      role_type?: string;
      roleType?: string;
    },
    actor: Actor,
  ): Promise<CourseStaffMessage> {
    const courseId = this.requiredUuid(input.course_id || input.courseId, 'curso');
    const professorId = this.requiredUuid(input.professor_id || input.professorId, 'docente');
    const roleType = String(input.role_type || input.roleType || '').trim();
    if (!['professor', 'assistant'].includes(roleType)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Tipo de docente inválido');
    }
    return this.repository.assignStaff(courseId, professorId, roleType, actor.email);
  }

  revokeStaff(input: {
    course_id?: string;
    courseId?: string;
    professor_id?: string;
    professorId?: string;
  }): Promise<void> {
    return this.repository.revokeStaff(
      this.requiredUuid(input.course_id || input.courseId, 'curso'),
      this.requiredUuid(input.professor_id || input.professorId, 'docente'),
    );
  }

  async importCatalog(
    content: Buffer,
    filename: string,
  ): Promise<{ accepted: boolean; rows: number; procedure: string }> {
    this.validateFilename(filename);
    const raw = csvRows(content, [
      'school_code',
      'school_name',
      'course_code',
      'course_name',
      'credits',
      'semester_year',
      'semester_term',
    ]);
    const rows = raw.map((row, index) => ({
      credits: integer(row.credits, 'credits', index + 2),
      school_code: required(row.school_code, 'school_code', index + 2),
      school_name: required(row.school_name, 'school_name', index + 2),
      course_code: required(row.course_code, 'course_code', index + 2),
      course_name: required(row.course_name, 'course_name', index + 2),
      semester_year: integer(row.semester_year, 'semester_year', index + 2),
      semester_term: this.term(row.semester_term, index + 2),
    }));
    try {
      await this.repository.importCatalog(rows);
    } catch (cause: unknown) {
      throw this.importProcedureError(cause);
    }
    return { accepted: true, rows: rows.length, procedure: 'sp_import_catalog_csv' };
  }

  async importRecordings(
    content: Buffer,
    filename: string,
    actor: Actor,
  ): Promise<{ accepted: boolean; rows: number; procedure: string }> {
    this.validateFilename(filename);
    const raw = csvRows(content, [
      'recording_id',
      'title',
      'course_code',
      'semester_year',
      'semester_term',
      'lecture_date',
      'unit',
      'topic',
      'video_path',
      'is_published',
      'professor_emails',
      'assistant_emails',
    ]);
    const rows = raw.map((row, index) => {
      const line = index + 2;
      const id = required(row.recording_id, 'recording_id', line);
      if (!uuidPattern.test(id))
        throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${line} tiene recording_id inválido`);
      const lectureDate = required(row.lecture_date, 'lecture_date', line);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(lectureDate) || Number.isNaN(Date.parse(`${lectureDate}T00:00:00Z`))) {
        throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${line} tiene lecture_date inválido`);
      }
      const professorEmails = this.emailList(row.professor_emails, 'professor_emails', line);
      const assistantEmails = this.emailList(row.assistant_emails, 'assistant_emails', line);
      return {
        recording_id: id,
        title: required(row.title, 'title', line),
        course_code: required(row.course_code, 'course_code', line),
        semester_year: integer(row.semester_year, 'semester_year', line),
        semester_term: this.term(row.semester_term, line),
        lecture_date: lectureDate,
        unit: String(row.unit || '').trim(),
        topic: String(row.topic || '').trim(),
        video_path: required(row.video_path, 'video_path', line),
        is_published: booleanValue(row.is_published, 'is_published', line),
        professor_emails: professorEmails,
        assistant_emails: assistantEmails,
      };
    });
    await this.repository.assertActorCanManageRecordingRows(rows, actor);
    try {
      await this.repository.importRecordings(rows);
    } catch (cause: unknown) {
      throw this.importProcedureError(cause);
    }
    return { accepted: true, rows: rows.length, procedure: 'sp_import_recordings_csv' };
  }

  private requiredText(value: unknown, field: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) throw grpcError(GrpcStatus.INVALID_ARGUMENT, `${field} es obligatorio`);
    return normalized;
  }

  private term(value: unknown, row: number): number {
    const term = integer(value, 'semester_term', row);
    if (![1, 2].includes(term)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} tiene semester_term inválido`);
    }
    return term;
  }

  private requiredUuid(value: unknown, field: string): string {
    const normalized = this.requiredText(value, field);
    if (!uuidPattern.test(normalized)) throw grpcError(GrpcStatus.INVALID_ARGUMENT, `${field} inválido`);
    return normalized;
  }

  private optionalString(value: unknown): string | undefined {
    const normalized = String(value || '').trim();
    return normalized || undefined;
  }

  private emailList(value: unknown, field: string, row: number): string {
    const emails = String(value || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
    for (const email of emails) {
      if (!emailPattern.test(email) || !institutionalEmailPattern.test(email))
        throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} tiene ${field} inválido`);
    }
    return emails.join(';');
  }

  private validateFilename(filename: string): void {
    if (!filename.toLowerCase().endsWith('.csv')) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Solo se permiten archivos .csv');
    }
  }

  private importProcedureError(cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'El Stored Procedure rechazó la importación';
    return grpcError(GrpcStatus.INVALID_ARGUMENT, message);
  }
}
