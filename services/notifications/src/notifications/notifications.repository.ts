import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { NOTIFICATION_POOL } from '../common/database/database.tokens';
import type { NotificationRecipient, SendBatchRequest, SendRequest } from './dto/notification.dto';

const OPTIONAL_TYPES = new Set(['new_recording', 'admin_notice']);

interface TemplateRow {
  id: string;
  code: string;
  subject: string;
  body_html: string;
}

export interface QueueItem {
  id: string;
  user_id: string;
  template_id: string | null;
  recipient: string;
  params_json: Record<string, unknown> | null;
  attempts: number;
  template_subject: string;
  template_body: string;
}

export interface PreferencesRecord {
  new_recording: boolean;
  admin_notice: boolean;
  recovery: true;
  security: true;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(NOTIFICATION_POOL) private readonly pool: Pool) {}

  async enqueue(input: SendRequest): Promise<string | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const id = await this.enqueueWithClient(client, input, {
        user_id: input.user_id || input.userId || '',
        recipient: input.recipient || '',
      });
      await client.query('COMMIT');
      return id;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async enqueueBatch(input: SendBatchRequest): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let queued = 0;
      for (const recipient of input.recipients || []) {
        const id = await this.enqueueWithClient(client, input, recipient);
        if (id) queued += 1;
      }
      await client.query('COMMIT');
      return queued;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async preferences(userId: string): Promise<PreferencesRecord> {
    const result = await this.pool.query<{ new_recording: boolean; admin_notice: boolean }>(
      `SELECT
        COALESCE((SELECT is_enabled FROM user_preferences WHERE user_id=$1 AND notification_type='new_recording'), true) new_recording,
        COALESCE((SELECT is_enabled FROM user_preferences WHERE user_id=$1 AND notification_type='admin_notice'), true) admin_notice`,
      [userId],
    );
    const row = result.rows[0] || { new_recording: true, admin_notice: true };
    return { ...row, recovery: true, security: true };
  }

  async updatePreferences(userId: string, newRecording: boolean, adminNotice: boolean): Promise<PreferencesRecord> {
    await this.pool.query(
      `INSERT INTO user_preferences(user_id,notification_type,is_enabled)
       VALUES ($1,'new_recording',$2),($1,'admin_notice',$3)
       ON CONFLICT (user_id,notification_type)
       DO UPDATE SET is_enabled=EXCLUDED.is_enabled`,
      [userId, newRecording, adminNotice],
    );
    return this.preferences(userId);
  }

  async claimPending(limit: number): Promise<QueueItem[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<QueueItem>(
        `SELECT q.id,q.user_id,q.template_id,q.recipient,q.params_json,q.attempts,
                t.subject template_subject,t.body_html template_body
           FROM email_queue q
           JOIN templates t ON t.id=q.template_id
          WHERE q.status IN ('pending','processing')
            AND q.available_at <= now()
            AND q.attempts < 4
          ORDER BY q.created_at
          LIMIT $1
          FOR UPDATE OF q SKIP LOCKED`,
        [limit],
      );
      for (const row of result.rows) {
        await client.query(
          `UPDATE email_queue
              SET status='processing',attempts=attempts+1,last_error=NULL
            WHERE id=$1`,
          [row.id],
        );
        row.attempts += 1;
      }
      await client.query('COMMIT');
      return result.rows;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markSent(item: QueueItem, subject: string, body: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE email_queue SET status='sent',sent_at=now(),last_error=NULL WHERE id=$1", [item.id]);
      await client.query(
        `INSERT INTO email_log(user_id,template_id,recipient,subject,body,sent_at,status)
         VALUES($1,$2,$3,$4,$5,now(),'sent')`,
        [item.user_id, item.template_id, item.recipient, subject, body],
      );
      await client.query('COMMIT');
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markFailed(
    item: QueueItem,
    message: string,
    subject: string,
    body: string,
    maxAttempts: number,
  ): Promise<void> {
    const terminal = item.attempts >= maxAttempts;
    const delaySeconds = [30, 60, 120][Math.max(0, item.attempts - 1)] || 120;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (terminal) {
        await client.query("UPDATE email_queue SET status='failed',last_error=$2 WHERE id=$1", [
          item.id,
          message.slice(0, 1000),
        ]);
        await client.query(
          `INSERT INTO email_log(user_id,template_id,recipient,subject,body,status)
           VALUES($1,$2,$3,$4,$5,'failed')`,
          [item.user_id, item.template_id, item.recipient, subject, body],
        );
      } else {
        await client.query(
          `UPDATE email_queue
              SET status='pending',available_at=now()+($2 * interval '1 second'),last_error=$3
            WHERE id=$1`,
          [item.id, delaySeconds, message.slice(0, 1000)],
        );
      }
      await client.query('COMMIT');
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async enqueueWithClient(
    client: PoolClient,
    input: SendRequest | SendBatchRequest,
    recipient: NotificationRecipient,
  ): Promise<string | undefined> {
    const userId = String(recipient.user_id || recipient.userId || '').trim();
    const email = String(recipient.recipient || '').trim();
    const type = String(input.type || '').trim() || 'registration';
    if (!userId || !email) throw new Error('El usuario y destinatario son obligatorios');
    if (OPTIONAL_TYPES.has(type)) {
      const preference = await client.query<{ is_enabled: boolean }>(
        'SELECT is_enabled FROM user_preferences WHERE user_id=$1 AND notification_type=$2',
        [userId, type],
      );
      if (preference.rows[0] && !preference.rows[0].is_enabled) return undefined;
    }
    const templateCode = String(input.template_code || input.templateCode || type).trim();
    const template = await client.query<TemplateRow>('SELECT id,code,subject,body_html FROM templates WHERE code=$1', [
      templateCode,
    ]);
    if (!template.rows[0]) throw new Error(`Plantilla inexistente: ${templateCode}`);
    const params = this.params(input);
    const result = await client.query<{ id: string }>(
      `INSERT INTO email_queue(user_id,template_id,recipient,params_json,status,available_at)
       VALUES($1,$2,$3,$4,'pending',now()) RETURNING id`,
      [userId, template.rows[0].id, email, JSON.stringify(params)],
    );
    return result.rows[0].id;
  }

  private params(input: SendRequest | SendBatchRequest): Record<string, unknown> {
    const raw = input.params_json || input.paramsJson || '';
    let params: Record<string, unknown> = {};
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('params_json inválido');
      params = parsed as Record<string, unknown>;
    }
    const subject = String(input.subject || '').trim();
    const body = String(input.body || '').trim();
    if (subject) params.subject = subject;
    if (body) params.body = body;
    return params;
  }
}
