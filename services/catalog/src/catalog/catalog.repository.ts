import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { CATALOG_POOL } from '../common/database/database.tokens';
import type {
  ListRequest,
  RecordingMessage,
  RecordingRequest,
  VoteRequest,
  AuthorizationReply,
  PlaybackAuthorizationRequest,
} from './dto/catalog.dto';
import { toRecordingMessage, type RecordingRow } from './mappers/recording.mapper';

@Injectable()
export class CatalogRepository {
  constructor(@Inject(CATALOG_POOL) private readonly pool: Pool) {}

  async list(input: ListRequest): Promise<RecordingMessage[]> {
    const result = await this.pool.query<RecordingRow>(
      `SELECT *
         FROM published_catalog
        WHERE ($1 = '' OR title ILIKE '%' || $1 || '%'
                    OR topic ILIKE '%' || $1 || '%'
                    OR course ILIKE '%' || $1 || '%'
                    OR course_code ILIKE '%' || $1 || '%')
          AND ($2 = '' OR school = $2)
          AND ($3 = '' OR course_code = $3)
          AND ($4 = '' OR semester = $4)
        ORDER BY title`,
      [input.query || '', input.school || '', input.course || '', input.semester || ''],
    );
    return result.rows.map(toRecordingMessage);
  }

  async find(input: RecordingRequest): Promise<RecordingMessage | undefined> {
    const result = await this.pool.query<RecordingRow>('SELECT * FROM recording_detail WHERE id=$1', [input.id || '']);
    return result.rows[0] ? toRecordingMessage(result.rows[0]) : undefined;
  }

  async authorization(input: PlaybackAuthorizationRequest): Promise<AuthorizationReply> {
    const result = await this.pool.query<{ video_path: string }>(
      'SELECT video_path FROM recordings WHERE id=$1 AND is_published',
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
}
