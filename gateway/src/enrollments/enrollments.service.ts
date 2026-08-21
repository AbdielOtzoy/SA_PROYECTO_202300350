import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type {
  CourseMessage,
  CoursesReply,
  EnrollmentMessage,
  EnrollmentsReply,
  EnrollmentView,
  SemesterMessage,
  SemestersReply,
} from '../common/grpc/grpc.types';
import type { EnrollmentsQuery, EnrollmentsResponse } from './dto/enrollments.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
  ) {}

  async list(request: Request, query: EnrollmentsQuery): Promise<EnrollmentsResponse> {
    const current = this.session.requireStudentOrAdmin(request);
    const isAdmin = current.claims.roles?.includes('admin') === true;
    const requestedUserId = String(query.user_id || query.userId || current.claims.sub).trim();
    if (!requestedUserId) throw new ForbiddenException('La cuenta de inscripción es obligatoria');
    if (!isAdmin && requestedUserId !== current.claims.sub) {
      throw new ForbiddenException('Solo puedes consultar tus propias inscripciones');
    }

    const response = await this.grpc.unary<
      { user_id: string; semester: string; status: string; credentials: string },
      EnrollmentsReply
    >(
      'identity',
      'ListEnrollments',
      {
        user_id: requestedUserId,
        semester: String(query.semester || '').trim(),
        status: String(query.status || '').trim(),
        credentials: String(query.credentials || '').trim(),
      },
      current.token,
    );

    const items = response.enrollments || [];
    if (items.length === 0) return { enrollments: [] };

    const [courses, semesters] = await Promise.all([
      this.grpc.unary<Record<string, never>, CoursesReply>('catalog', 'ListCourses', {}, current.token),
      this.grpc.unary<Record<string, never>, SemestersReply>('catalog', 'ListSemesters', {}, current.token),
    ]);
    return {
      enrollments: items.map((item) =>
        this.enrich(item, requestedUserId, courses.courses || [], semesters.semesters || []),
      ),
    };
  }

  private enrich(
    enrollment: EnrollmentMessage,
    userId: string,
    courses: CourseMessage[],
    semesters: SemesterMessage[],
  ): EnrollmentView {
    const courseId = enrollment.course_id || enrollment.courseId || '';
    const semesterId = enrollment.semester_id || enrollment.semesterId || '';
    const course = courses.find((item) => item.id === courseId);
    const semester = semesters.find((item) => item.id === semesterId);
    const year = Number(semester?.year || 0);
    const term = Number(semester?.term || 0);

    return {
      user_id: userId,
      course_id: courseId,
      course_code: course?.code || '',
      course_name: course?.name || 'Curso no disponible',
      credits: Number(course?.credits || 0),
      semester_id: semesterId,
      semester: semester ? `${year}-${term}` : 'Semestre no disponible',
      semester_year: year,
      semester_term: term,
      status: enrollment.status || '',
      credentials: enrollment.credentials || '',
    };
  }
}
