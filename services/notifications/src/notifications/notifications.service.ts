import { Injectable } from '@nestjs/common';
import type {
  PreferencesReply,
  SendBatchReply,
  SendBatchRequest,
  SendReply,
  SendRequest,
  UpdatePreferencesRequest,
} from './dto/notification.dto';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async send(input: SendRequest): Promise<SendReply> {
    const queueId = await this.repository.enqueue(input);
    return { accepted: true, queue_id: queueId, queued: queueId ? 1 : 0 };
  }

  async sendBatch(input: SendBatchRequest): Promise<SendBatchReply> {
    const queued = await this.repository.enqueueBatch(input);
    return { accepted: true, queued };
  }

  preferences(userId: string): Promise<PreferencesReply> {
    return this.repository.preferences(userId);
  }

  updatePreferences(userId: string, input: UpdatePreferencesRequest): Promise<PreferencesReply> {
    return this.repository.updatePreferences(
      userId,
      input.new_recording === true ||
        (input as UpdatePreferencesRequest & { newRecording?: boolean }).newRecording === true,
      input.admin_notice === true ||
        (input as UpdatePreferencesRequest & { adminNotice?: boolean }).adminNotice === true,
    );
  }
}
