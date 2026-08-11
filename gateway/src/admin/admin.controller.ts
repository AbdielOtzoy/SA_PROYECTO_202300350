import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AppConfig } from '../common/config/app-config';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';

interface RoleBody {
  role?: string;
  assign?: boolean;
}
interface ImportReply {
  accepted: boolean;
  rows: number;
  procedure: string;
}
interface UploadedCsv {
  buffer: Buffer;
  originalname: string;
  size: number;
}

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
    private readonly config: AppConfig,
  ) {}

  @Get('analytics/most-viewed')
  mostViewed(@Req() request: Request, @Query('week_start') weekStart?: string) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary('analytics', 'MostViewed', { week_start: weekStart || '' }, current.token);
  }

  @Get('users')
  users(@Req() request: Request) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary('identity', 'ListUsers', {}, current.token);
  }

  @Put('users/:id/roles')
  role(@Req() request: Request, @Param('id') userId: string, @Body() body: RoleBody) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary(
      'identity',
      'ChangeRole',
      { user_id: userId, role: body.role || '', assign: !!body.assign, actor_id: current.claims.sub },
      current.token,
    );
  }

  @Get('schools')
  schools(@Req() request: Request) {
    return this.listCatalog(request, 'ListSchools');
  }
  @Get('courses')
  courses(@Req() request: Request) {
    return this.listCatalog(request, 'ListCourses');
  }
  @Get('semesters')
  semesters(@Req() request: Request) {
    return this.listCatalog(request, 'ListSemesters');
  }
  @Get('professors')
  professors(@Req() request: Request) {
    return this.listCatalog(request, 'ListProfessors');
  }

  @Get('course-staff')
  staff(@Req() request: Request, @Query('course_id') courseId?: string) {
    const current = this.session.requireManager(request);
    return this.grpc.unary('catalog', 'ListCourseStaff', { course_id: courseId || '' }, current.token);
  }

  @Post('schools')
  school(@Req() request: Request, @Body() body: unknown) {
    return this.upsert(request, 'UpsertSchool', 'school', body);
  }
  @Put('schools/:id')
  schoolUpdate(@Req() request: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.upsert(request, 'UpsertSchool', 'school', { ...body, id });
  }
  @Delete('schools/:id')
  schoolArchive(@Req() request: Request, @Param('id') id: string) {
    return this.archive(request, 'school', id);
  }

  @Post('courses')
  course(@Req() request: Request, @Body() body: unknown) {
    return this.upsert(request, 'UpsertCourse', 'course', body);
  }
  @Put('courses/:id')
  courseUpdate(@Req() request: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.upsert(request, 'UpsertCourse', 'course', { ...body, id });
  }
  @Delete('courses/:id')
  courseArchive(@Req() request: Request, @Param('id') id: string) {
    return this.archive(request, 'course', id);
  }

  @Post('semesters')
  semester(@Req() request: Request, @Body() body: unknown) {
    return this.upsert(request, 'UpsertSemester', 'semester', body);
  }
  @Put('semesters/:id')
  semesterUpdate(@Req() request: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.upsert(request, 'UpsertSemester', 'semester', { ...body, id });
  }
  @Delete('semesters/:id')
  semesterArchive(@Req() request: Request, @Param('id') id: string) {
    return this.archive(request, 'semester', id);
  }

  @Post('professors')
  professor(@Req() request: Request, @Body() body: unknown) {
    return this.upsert(request, 'UpsertProfessor', 'professor', body);
  }
  @Put('professors/:id')
  professorUpdate(@Req() request: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.upsert(request, 'UpsertProfessor', 'professor', { ...body, id });
  }
  @Delete('professors/:id')
  professorArchive(@Req() request: Request, @Param('id') id: string) {
    return this.archive(request, 'professor', id);
  }

  @Post('course-staff')
  assignStaff(@Req() request: Request, @Body() body: Record<string, unknown>) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary(
      'catalog',
      'AssignCourseStaff',
      {
        course_id: body.course_id || body.courseId || '',
        professor_id: body.professor_id || body.professorId || '',
        role_type: body.role_type || body.roleType || '',
      },
      current.token,
    );
  }

  @Delete('course-staff')
  revokeStaff(@Req() request: Request, @Query('course_id') courseId = '', @Query('professor_id') professorId = '') {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary(
      'catalog',
      'RevokeCourseStaff',
      { course_id: courseId, professor_id: professorId },
      current.token,
    );
  }

  @Post('imports/catalog')
  @UseInterceptors(FileInterceptor('file'))
  importCatalog(@Req() request: Request, @UploadedFile() file?: UploadedCsv): Promise<ImportReply> {
    const current = this.session.requireAdmin(request);
    return this.importFile(file, 'catalog', current.token);
  }

  @Post('imports/recordings')
  @UseInterceptors(FileInterceptor('file'))
  importRecordings(@Req() request: Request, @UploadedFile() file?: UploadedCsv): Promise<ImportReply> {
    const current = this.session.requireManager(request);
    return this.importFile(file, 'recordings', current.token);
  }

  @Post('imports/enrollments')
  @UseInterceptors(FileInterceptor('file'))
  importEnrollments(@Req() request: Request, @UploadedFile() file?: UploadedCsv): Promise<ImportReply> {
    const current = this.session.requireAdmin(request);
    return this.importFile(file, 'enrollments', current.token);
  }

  private listCatalog(request: Request, method: string) {
    const current = this.session.requireManager(request);
    return this.grpc.unary('catalog', method, {}, current.token);
  }

  private upsert(request: Request, method: string, key: string, body: unknown) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary('catalog', method, { [key]: body }, current.token);
  }

  private archive(request: Request, entity: string, id: string) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary('catalog', 'ArchiveAcademic', { entity, id }, current.token);
  }

  private importFile(
    file: UploadedCsv | undefined,
    kind: 'catalog' | 'recordings' | 'enrollments',
    token: string,
  ): Promise<ImportReply> {
    if (!file) throw new BadRequestException('Debe adjuntar un archivo CSV en el campo file');
    if (file.size > this.config.csvMaxBytes) throw new BadRequestException('El archivo CSV excede el tamaño permitido');
    if (!file.originalname.toLowerCase().endsWith('.csv'))
      throw new BadRequestException('Solo se permiten archivos .csv');
    const service = kind === 'enrollments' ? 'identity' : 'catalog';
    const method =
      kind === 'catalog' ? 'ImportCatalogCsv' : kind === 'recordings' ? 'ImportRecordingsCsv' : 'ImportEnrollmentsCsv';
    return this.grpc.unary(service, method, { content: file.buffer, filename: file.originalname }, token);
  }
}
