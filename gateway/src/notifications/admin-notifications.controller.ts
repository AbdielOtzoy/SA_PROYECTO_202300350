import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GatewayNotificationsService } from './notifications.service';
import type { AdminNoticeBody } from './dto/notifications.dto';

@Controller('api/admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: GatewayNotificationsService) {}

  @Post()
  announce(@Req() request: Request, @Body() body: AdminNoticeBody) {
    return this.notifications.announce(request, body);
  }
}
