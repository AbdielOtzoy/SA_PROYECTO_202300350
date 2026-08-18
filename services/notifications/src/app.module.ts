import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfig } from './common/config/app-config';
import { InternalAuthService } from './common/auth/internal-auth.service';
import { NOTIFICATION_MAILER, NOTIFICATION_POOL } from './common/database/database.tokens';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsRepository } from './notifications/notifications.repository';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsWorker } from './notifications/notifications.worker';

@Module({
  controllers: [NotificationsController],
  providers: [
    AppConfig,
    InternalAuthService,
    NotificationsRepository,
    NotificationsService,
    NotificationsWorker,
    {
      provide: NOTIFICATION_POOL,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new Pool({ connectionString: config.databaseUrl }),
    },
    {
      provide: NOTIFICATION_MAILER,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Transporter =>
        nodemailer.createTransport({ host: config.mailHost, port: config.mailPort, secure: false }),
    },
  ],
})
export class AppModule {}
