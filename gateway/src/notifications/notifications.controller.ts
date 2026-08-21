import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GatewayNotificationsService } from './notifications.service';
import type { PreferencesBody } from './dto/notifications.dto';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: GatewayNotificationsService) {}

  @Get('preferences')
  async preferences(@Req() request: Request) {
    return { preferences: await this.notifications.preferences(request) };
  }

  @Put('preferences')
  async updatePreferences(@Req() request: Request, @Body() body: PreferencesBody) {
    return { preferences: await this.notifications.updatePreferences(request, body) };
  }
}
