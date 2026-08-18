import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type {
  AnalyticsCatalogPageReply,
  ListRecordingsReply,
  RatingReply,
  RecordingMessage,
  RecordingReply,
} from '../common/grpc/grpc.types';
import type { CatalogQuery, VoteBody } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
  ) {}

  async list(request: Request, query: CatalogQuery): Promise<ListRecordingsReply> {
    const current = this.session.require(request);
    const response = await this.grpc.unary<
      {
        query: string;
        school: string;
        course: string;
        semester: string;
        professor: string;
        page: number;
        page_size: number;
        user_id: string;
      },
      AnalyticsCatalogPageReply
    >(
      'analytics',
      'GetCatalogPage',
      {
        query: query.q || '',
        school: query.school || '',
        course: query.course || '',
        semester: query.semester || '',
        professor: query.professor || '',
        page: Number(query.page || 1),
        page_size: Math.min(10, Math.max(1, Number(query.page_size || 10))),
        user_id: current.claims.sub,
      },
      current.token,
    );
    return {
      recordings: response.recordings.map((item): RecordingMessage => ({
        id: item.recording_id,
        title: item.title,
        course: item.course,
        course_code: item.course_code,
        school: item.school,
        semester: item.semester,
        unit: item.unit,
        topic: item.topic,
        video_path: item.video_path,
        recommendation: item.recommendation,
        professor: item.professor,
        course_id: item.course_id,
        positives: item.positives,
        total_votes: item.total_votes,
        has_user_vote: item.has_user_vote,
        user_vote: item.user_vote,
        views: item.views,
      })),
      page: response.page,
      page_size: response.page_size,
      total: response.total,
      total_pages: response.total_pages,
    };
  }

  async options(request: Request) {
    const current = this.session.require(request);
    const [schools, courses, semesters, professors] = await Promise.all([
      this.grpc.unary('catalog', 'ListSchools', {}, current.token),
      this.grpc.unary('catalog', 'ListCourses', {}, current.token),
      this.grpc.unary('catalog', 'ListSemesters', {}, current.token),
      this.grpc.unary('catalog', 'ListProfessors', {}, current.token),
    ]);
    return { schools, courses, semesters, professors };
  }

  detail(request: Request, id: string): Promise<RecordingReply> {
    const current = this.session.require(request);
    return this.grpc.unary('catalog', 'GetRecording', { id }, current.token);
  }

  async vote(request: Request, recordingId: string, body: VoteBody): Promise<RatingReply> {
    const current = this.session.require(request);
    const result = await this.grpc.unary<{ user_id: string; recording_id: string; vote: boolean }, RatingReply>(
      'catalog',
      'Vote',
      {
        user_id: current.claims.sub,
        recording_id: recordingId,
        vote: !!body.vote,
      },
      current.token,
    );
    await Promise.all([
      this.grpc.unary('analytics', 'InvalidateCatalogCache', {}, current.token),
      this.grpc.unary('analytics', 'InvalidateAnalyticsCache', {}, current.token),
    ]);
    return result;
  }
}
