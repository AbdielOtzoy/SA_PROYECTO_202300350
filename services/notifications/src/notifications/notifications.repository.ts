import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { NOTIFICATION_POOL } from '../common/database/database.tokens';
import type { SendRequest } from './dto/notification.dto';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(NOTIFICATION_POOL) private readonly pool: Pool) {}

  enqueue(input: SendRequest): Promise<unknown> {
    return this.pool.query("INSERT INTO email_queue(user_id,recipient,params_json,status) VALUES($1,$2,$3,'sent')", [
      input.user_id || input.userId || '',
      input.recipient || '',
      JSON.stringify(input),
    ]);
  }
}
