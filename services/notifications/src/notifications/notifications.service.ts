import { Inject, Injectable } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { NOTIFICATION_MAILER } from '../common/database/database.tokens';
import type { SendReply, SendRequest } from './dto/notification.dto';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    @Inject(NOTIFICATION_MAILER) private readonly mailer: Transporter,
  ) {}

  async send(input: SendRequest): Promise<SendReply> {
    await this.mailer.sendMail({
      from: 'noreply@yousac.local',
      to: input.recipient || '',
      subject: input.subject || '',
      text: input.body || '',
    });
    await this.repository.enqueue(input);
    return { accepted: true };
  }
}
