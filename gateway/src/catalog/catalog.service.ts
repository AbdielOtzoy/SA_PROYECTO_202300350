import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type {
  AnalyticsCatalogPageReply,
  CatalogTopicsReply,
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
        topic: string;
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
        topic: query.topic || '',
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
        topics: item.topics || [],
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
    const [schools, courses, semesters, professors, topics] = await Promise.all([
      this.grpc.unary('catalog', 'ListSchools', {}, current.token),
      this.grpc.unary('catalog', 'ListCourses', {}, current.token),
      this.grpc.unary('catalog', 'ListSemesters', {}, current.token),
      this.grpc.unary('catalog', 'ListProfessors', {}, current.token),
      this.grpc.unary<Record<string, never>, CatalogTopicsReply>('catalog', 'ListTopics', {}, current.token),
    ]);
    return { schools, courses, semesters, professors, topics };
  }

  async detail(request: Request, id: string): Promise<RecordingReply> {
    const current = this.session.require(request);
    const response = await this.grpc.unary<{ id: string }, { recording: Record<string, unknown> }>(
      'catalog',
      'GetRecording',
      { id },
      current.token,
    );
    const source = response.recording || {};
    const participant = (value: unknown) => {
      const item = (value || {}) as Record<string, unknown>;
      return {
        id: String(item.id || ''),
        full_name: String(item.full_name ?? item.fullName ?? ''),
        email: String(item.email || ''),
      };
    };
    const attachment = (value: unknown) => {
      const item = (value || {}) as Record<string, unknown>;
      return {
        id: String(item.id || ''),
        filename: String(item.filename || ''),
        file_path: String(item.file_path ?? item.filePath ?? ''),
        file_type: String(item.file_type ?? item.fileType ?? ''),
        attachment_type: String(item.attachment_type ?? item.attachmentType ?? 'material'),
      };
    };
    return {
      recording: {
        id: String(source.id || ''),
        title: String(source.title || ''),
        course: String(source.course || ''),
        course_code: String(source.course_code ?? source.courseCode ?? ''),
        school: String(source.school || ''),
        semester: String(source.semester || ''),
        unit: String(source.unit || ''),
        topic: String(source.topic || ''),
        topics: Array.isArray(source.topics) ? source.topics.map(String) : [],
        video_path: String(source.video_path ?? source.videoPath ?? ''),
        recommendation: Number(source.recommendation || 0),
        professor: String(source.professor || ''),
        course_id: String(source.course_id ?? source.courseId ?? ''),
        lecture_date: String(source.lecture_date ?? source.lectureDate ?? ''),
        positives: Number(source.positives || 0),
        total_votes: Number(source.total_votes ?? source.totalVotes ?? 0),
        has_user_vote: Boolean(source.has_user_vote ?? source.hasUserVote ?? false),
        user_vote: Boolean(source.user_vote ?? source.userVote ?? false),
        professors: Array.isArray(source.professors) ? source.professors.map(participant) : [],
        assistants: Array.isArray(source.assistants) ? source.assistants.map(participant) : [],
        attachments: Array.isArray(source.attachments) ? source.attachments.map(attachment) : [],
      },
    };
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
