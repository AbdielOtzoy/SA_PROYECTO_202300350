import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { InternalAuthService } from '../common/auth/internal-auth.service';
import type {
  PreferencesRequest,
  SendBatchReply,
  SendBatchRequest,
  SendRequest,
  UpdatePreferencesRequest,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly auth: InternalAuthService,
  ) {}

  @GrpcMethod('NotificationService', 'Send')
  send(data: SendRequest, metadata: Metadata) {
    this.auth.verify(metadata);
    return this.notifications.send(data).then((reply) => ({
      accepted: reply.accepted,
      queueId: reply.queue_id || '',
      queued: reply.queued || 0,
    }));
  }

  @GrpcMethod('NotificationService', 'SendBatch')
  sendBatch(data: SendBatchRequest, metadata: Metadata): Promise<SendBatchReply> {
    this.auth.verify(metadata);
    return this.notifications.sendBatch(data);
  }

  @GrpcMethod('NotificationService', 'GetPreferences')
  preferences(data: PreferencesRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    const userId = String(data?.user_id || data?.userId || '');
    if (!userId || userId !== String(claims.sub || '')) this.auth.denied('Preferencias ajenas');
    return this.notifications.preferences(userId).then((reply) => ({
      newRecording: reply.new_recording,
      adminNotice: reply.admin_notice,
      recovery: reply.recovery,
      security: reply.security,
    }));
  }

  @GrpcMethod('NotificationService', 'UpdatePreferences')
  updatePreferences(data: UpdatePreferencesRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    const userId = String(data?.user_id || data?.userId || '');
    if (!userId || userId !== String(claims.sub || '')) this.auth.denied('Preferencias ajenas');
    return this.notifications.updatePreferences(userId, data).then((reply) => ({
      newRecording: reply.new_recording,
      adminNotice: reply.admin_notice,
      recovery: reply.recovery,
      security: reply.security,
    }));
  }
}
