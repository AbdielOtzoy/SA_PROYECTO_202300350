import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { InternalAuthService } from '../common/auth/internal-auth.service';
import type { SendReply, SendRequest } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly auth: InternalAuthService,
  ) {}

  @GrpcMethod('NotificationService', 'Send')
  send(data: SendRequest, metadata: Metadata): Promise<SendReply> {
    this.auth.verify(metadata);
    return this.notifications.send(data);
  }
}
