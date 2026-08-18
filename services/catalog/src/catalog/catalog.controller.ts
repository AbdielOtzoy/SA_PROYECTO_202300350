import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { InternalAuthService } from '../common/auth/internal-auth.service';
import type {
  Actor,
  ListRequest,
  PlaybackAuthorizationRequest,
  RecordingRequest,
  VoteRequest,
} from './dto/catalog.dto';
import { CatalogService } from './catalog.service';

const schoolProto = (value: Record<string, unknown>) => ({
  id: value.id,
  name: value.name,
  code: value.code,
  isActive: value.isActive,
});

const courseProto = (value: Record<string, unknown>) => ({
  id: value.id,
  code: value.code,
  name: value.name,
  schoolId: value.schoolId,
  credits: value.credits,
  isActive: value.isActive,
});

const semesterProto = (value: Record<string, unknown>) => ({
  id: value.id,
  year: value.year,
  term: value.term,
  isActive: value.isActive,
});

const professorProto = (value: Record<string, unknown>) => ({
  id: value.id,
  fullName: value.fullName,
  email: value.email,
  isActive: value.isActive,
});

const staffProto = (value: Record<string, unknown>) => ({
  courseId: value.courseId,
  professorId: value.professorId,
  roleType: value.roleType,
  courseCode: value.courseCode,
  professorName: value.professorName,
  professorEmail: value.professorEmail,
});

@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly auth: InternalAuthService,
  ) {}

  @GrpcMethod('CatalogService', 'ListRecordings')
  list(data: ListRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    const requestedUser = data?.user_id || data?.userId || '';
    if (requestedUser && requestedUser !== String(claims.sub || '') && !claims.roles?.includes('admin')) {
      this.auth.denied('El usuario solicitado no coincide con la sesión');
    }
    return this.catalog.list(data || {});
  }

  @GrpcMethod('CatalogService', 'GetRecording')
  detail(data: RecordingRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.detail(data);
  }

  @GrpcMethod('CatalogService', 'CanPlay')
  canPlay(data: PlaybackAuthorizationRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.authorization(data);
  }

  @GrpcMethod('CatalogService', 'Vote')
  vote(data: VoteRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.vote(data);
  }

  @GrpcMethod('CatalogService', 'ListSchools')
  schools(_: unknown, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.schools().then((schools) => ({
      schools: schools.map((value) => schoolProto(value as unknown as Record<string, unknown>)),
    }));
  }

  @GrpcMethod('CatalogService', 'ListCourses')
  courses(_: unknown, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.courses().then((courses) => ({
      courses: courses.map((value) => courseProto(value as unknown as Record<string, unknown>)),
    }));
  }

  @GrpcMethod('CatalogService', 'ListSemesters')
  semesters(_: unknown, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.semesters().then((semesters) => ({
      semesters: semesters.map((value) => semesterProto(value as unknown as Record<string, unknown>)),
    }));
  }

  @GrpcMethod('CatalogService', 'ListProfessors')
  professors(_: unknown, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.catalog.professors().then((professors) => ({
      professors: professors.map((value) => professorProto(value as unknown as Record<string, unknown>)),
    }));
  }

  @GrpcMethod('CatalogService', 'ListCourseStaff')
  staff(data: { course_id?: string; courseId?: string }, metadata: Metadata) {
    const actor = this.requireManager(metadata);
    return this.catalog.staff(data?.course_id || data?.courseId || '', actor).then((assignments) => ({
      assignments: assignments.map((value) => staffProto(value as unknown as Record<string, unknown>)),
    }));
  }

  @GrpcMethod('CatalogService', 'UpsertSchool')
  upsertSchool(data: unknown, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog
      .upsertSchool(data)
      .then((school) => ({ school: schoolProto(school as unknown as Record<string, unknown>) }));
  }

  @GrpcMethod('CatalogService', 'UpsertCourse')
  upsertCourse(data: unknown, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog
      .upsertCourse(data)
      .then((course) => ({ course: courseProto(course as unknown as Record<string, unknown>) }));
  }

  @GrpcMethod('CatalogService', 'UpsertSemester')
  upsertSemester(data: unknown, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog
      .upsertSemester(data)
      .then((semester) => ({ semester: semesterProto(semester as unknown as Record<string, unknown>) }));
  }

  @GrpcMethod('CatalogService', 'UpsertProfessor')
  upsertProfessor(data: unknown, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog
      .upsertProfessor(data)
      .then((professor) => ({ professor: professorProto(professor as unknown as Record<string, unknown>) }));
  }

  @GrpcMethod('CatalogService', 'ArchiveAcademic')
  archive(data: { entity?: string; id?: string }, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog.archive(data).then(() => ({}));
  }

  @GrpcMethod('CatalogService', 'AssignCourseStaff')
  assignStaff(
    data: {
      course_id?: string;
      courseId?: string;
      professor_id?: string;
      professorId?: string;
      role_type?: string;
      roleType?: string;
    },
    metadata: Metadata,
  ) {
    const actor = this.requireAdmin(metadata);
    return this.catalog.assignStaff(data, actor).then((assignment) => ({
      assignment: staffProto(assignment as unknown as Record<string, unknown>),
    }));
  }

  @GrpcMethod('CatalogService', 'RevokeCourseStaff')
  revokeStaff(data: { course_id?: string; professor_id?: string }, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog.revokeStaff(data).then(() => ({}));
  }

  @GrpcMethod('CatalogService', 'ImportCatalogCsv')
  importCatalog(data: { content?: Buffer; filename?: string }, metadata: Metadata) {
    this.requireAdmin(metadata);
    return this.catalog.importCatalog(Buffer.from(data?.content || ''), data?.filename || '');
  }

  @GrpcMethod('CatalogService', 'ImportRecordingsCsv')
  importRecordings(data: { content?: Buffer; filename?: string }, metadata: Metadata) {
    const actor = this.requireManager(metadata);
    return this.catalog.importRecordings(Buffer.from(data?.content || ''), data?.filename || '', actor);
  }

  private requireAdmin(metadata: Metadata): Actor {
    const actor = this.actor(metadata);
    if (!actor.roles.includes('admin')) this.auth.denied('Rol administrador requerido');
    return actor;
  }

  private requireManager(metadata: Metadata): Actor {
    const actor = this.actor(metadata);
    if (!actor.roles.some((role) => ['admin', 'teacher', 'assistant'].includes(role))) {
      this.auth.denied('Rol administrativo o académico requerido');
    }
    return actor;
  }

  private actor(metadata: Metadata): Actor {
    const claims = this.auth.verify(metadata);
    return {
      id: String(claims.sub || ''),
      email: String(claims.email || ''),
      roles: Array.isArray(claims.roles) ? claims.roles.map(String) : [],
    };
  }
}
