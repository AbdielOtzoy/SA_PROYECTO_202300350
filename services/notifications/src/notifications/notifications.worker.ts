import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { NOTIFICATION_MAILER } from '../common/database/database.tokens';
import { AppConfig } from '../common/config/app-config';
import { NotificationsRepository, type QueueItem } from './notifications.repository';

@Injectable()
export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly config: AppConfig,
    @Inject(NOTIFICATION_MAILER) private readonly mailer: Transporter,
  ) {}

  onModuleInit(): void {
    void this.process();
    this.timer = setInterval(() => void this.process(), this.config.notificationPollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async process(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const items = await this.repository.claimPending(this.config.notificationBatchSize);
      await Promise.all(items.map((item) => this.deliver(item)));
    } finally {
      this.running = false;
    }
  }

  private async deliver(item: QueueItem): Promise<void> {
    const params = item.params_json || {};
    const subject = this.render(String(params.subject || item.template_subject), params);
    const html = this.render(String(params.body || item.template_body), params);
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    try {
      await this.withTimeout(
        this.mailer.sendMail({ from: 'noreply@yousac.local', to: item.recipient, subject, html, text }),
        this.config.mailSendTimeoutMs,
      );
      await this.repository.markSent(item, subject, html);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error de entrega SMTP';
      await this.repository.markFailed(item, message, subject, html, this.config.notificationMaxAttempts);
    }
  }

  private render(template: string, params: Record<string, unknown>): string {
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => String(params[key] ?? ''));
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('El servidor SMTP excedió el tiempo máximo')), timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}
