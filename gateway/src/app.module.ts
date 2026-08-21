import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { PlaybackModule } from './playback/playback.module';
import { AdminController } from './admin/admin.controller';
import { CommonModule } from './common/common.module';
import { AnalyticsController } from './analytics/analytics.controller';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [CommonModule, AuthModule, CatalogModule, PlaybackModule, EnrollmentsModule, NotificationsModule],
  controllers: [AdminController, AnalyticsController],
})
export class AppModule {}
