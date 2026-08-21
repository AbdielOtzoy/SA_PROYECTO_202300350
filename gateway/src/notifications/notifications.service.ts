import { BadRequestException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../common/config/app-config';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type {
  CoursesReply,
  NotificationPreferences,
  NotificationBatchReply,
  NotificationRecipientsReply,
  PublishedRecording,
} from '../common/grpc/grpc.types';
import type { AdminNoticeBody, PreferencesBody } from './dto/notifications.dto';

const ROLES = new Set(['student', 'teacher', 'assistant', 'admin']);

@Injectable()
export class GatewayNotificationsService {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
    private readonly config: AppConfig,
  ) {}

  preferences(request: Request): Promise<NotificationPreferences> {
    const current = this.session.require(request);
    return this.grpc.unary('notifications', 'GetPreferences', { user_id: current.claims.sub }, current.token);
  }

  updatePreferences(request: Request, body: PreferencesBody): Promise<NotificationPreferences> {
    const current = this.session.require(request);
    if (typeof body.new_recording !== 'boolean' || typeof body.admin_notice !== 'boolean') {
      throw new BadRequestException('Debe indicar las dos preferencias editables');
    }
    return this.grpc.unary(
      'notifications',
      'UpdatePreferences',
      {
        user_id: current.claims.sub,
        new_recording: body.new_recording,
        admin_notice: body.admin_notice,
      },
      current.token,
    );
  }

  async announce(request: Request, body: AdminNoticeBody) {
    const current = this.session.requireAdmin(request);
    const targetType = String(body.target_type || '')
      .trim()
      .toLowerCase();
    const targetValue = String(body.target_value || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.body || '').trim();
    if (!['role', 'course'].includes(targetType) || !targetValue) {
      throw new BadRequestException('La audiencia debe ser un rol o un curso');
    }
    if (!subject || subject.length > 200 || !message || message.length > 5000) {
      throw new BadRequestException('El asunto o el cuerpo del aviso no son válidos');
    }
    let recipients: NotificationRecipientsReply;
    if (targetType === 'role') {
      if (!ROLES.has(targetValue)) throw new BadRequestException('Rol de audiencia inválido');
      recipients = await this.grpc.unary(
        'identity',
        'ListNotificationRecipients',
        { role: targetValue, status: '' },
        current.token,
      );
    } else {
      const courses = await this.grpc.unary<unknown, CoursesReply>('catalog', 'ListCourses', {}, current.token);
      if (!courses.courses.some((course) => course.id === targetValue)) {
        throw new BadRequestException('El curso no existe o está archivado');
      }
      recipients = await this.grpc.unary(
        'identity',
        'ListNotificationRecipients',
        { course_id: targetValue, status: 'active' },
        current.token,
      );
    }
    const result = await this.grpc.unary<unknown, NotificationBatchReply>(
      'notifications',
      'SendBatch',
      {
        type: 'admin_notice',
        template_code: 'admin_notice',
        subject,
        body: message,
        recipients: recipients.recipients || [],
      },
      current.token,
    );
    return { accepted: true, recipients: recipients.recipients?.length || 0, queued: result.queued || 0 };
  }

  async notifyPublished(recordings: PublishedRecording[]): Promise<void> {
    const token = this.session.issueInternalToken(['identity:notification_recipients', 'notifications:enqueue']);
    const unique = new Map(recordings.map((recording) => [recording.recording_id, recording]));
    for (const recording of unique.values()) {
      const recipients: NotificationRecipientsReply = await this.grpc.unary(
        'identity',
        'ListNotificationRecipients',
        { course_id: recording.course_id, status: 'active' },
        token,
      );
      if (!recipients.recipients?.length) continue;
      await this.grpc.unary(
        'notifications',
        'SendBatch',
        {
          type: 'new_recording',
          template_code: 'new_recording',
          params_json: JSON.stringify({
            title: recording.title,
            course: recording.course,
            course_code: recording.course_code,
            recording_url: `${this.config.frontendUrl}/reproductor/${recording.recording_id}`,
          }),
          recipients: recipients.recipients,
        },
        token,
      );
    }
  }
}
