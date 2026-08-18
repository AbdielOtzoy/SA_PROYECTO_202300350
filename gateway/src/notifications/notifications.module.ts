import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { NotificationsController } from './notifications.controller';
import { GatewayNotificationsService } from './notifications.service';

@Module({
  imports: [CommonModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [GatewayNotificationsService],
  exports: [GatewayNotificationsService],
})
export class NotificationsModule {}
