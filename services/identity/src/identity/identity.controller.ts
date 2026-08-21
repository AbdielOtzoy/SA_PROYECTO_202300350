import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { InternalAuthService } from '../common/auth/internal-auth.service';
import type {
  ChangeRoleRequest,
  EnrollmentsRequest,
  LoginRequest,
  OAuthLoginRequest,
  RegisterRequest,
  SessionRequest,
  PasswordResetRequest,
  ResetPasswordRequest,
  NotificationRecipientsRequest,
} from './dto/identity.dto';
import { IdentityService } from './identity.service';

@Controller()
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly auth: InternalAuthService,
  ) {}

  @GrpcMethod('IdentityService', 'Register') register(data: RegisterRequest) {
    return this.identity.register(data);
  }
  @GrpcMethod('IdentityService', 'Login') login(data: LoginRequest) {
    return this.identity.login(data);
  }
  @GrpcMethod('IdentityService', 'OAuthLogin') oauthLogin(data: OAuthLoginRequest) {
    return this.identity.oauthLogin(data);
  }

  @GrpcMethod('IdentityService', 'RequestPasswordReset')
  requestPasswordReset(data: PasswordResetRequest, metadata: Metadata) {
    this.requirePermission(metadata, 'identity:recovery');
    return this.identity.requestPasswordReset(data).then((reply) => ({
      accepted: reply.accepted,
      userId: reply.user_id || '',
      recipient: reply.recipient || '',
      resetToken: reply.reset_token || '',
    }));
  }

  @GrpcMethod('IdentityService', 'ResetPassword')
  resetPassword(data: ResetPasswordRequest, metadata: Metadata) {
    this.requirePermission(metadata, 'identity:recovery');
    return this.identity.resetPassword(data);
  }

  @GrpcMethod('IdentityService', 'GetSession')
  session(data: SessionRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.session(data, claims.sub);
  }

  @GrpcMethod('IdentityService', 'ListEnrollments')
  enrollments(data: EnrollmentsRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.enrollments(data, claims.sub, claims.roles?.includes('admin') === true);
  }

  @GrpcMethod('IdentityService', 'ListNotificationRecipients')
  notificationRecipients(data: NotificationRecipientsRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    const isAdmin = claims.roles?.includes('admin') === true;
    const isGateway = claims.roles?.includes('gateway') === true;
    if (!isAdmin && !(isGateway && claims.permissions?.includes('identity:notification_recipients'))) {
      this.auth.denied('Permiso de destinatarios de notificaciones requerido');
    }
    return this.identity.notificationRecipients(data || {}).then((reply) => ({
      recipients: reply.recipients.map((recipient) => ({
        userId: recipient.userId,
        recipient: recipient.recipient,
        fullName: recipient.fullName,
      })),
    }));
  }

  @GrpcMethod('IdentityService', 'ChangeRole')
  role(data: ChangeRoleRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.changeRole(data, claims.roles?.includes('admin') === true);
  }

  @GrpcMethod('IdentityService', 'ListUsers')
  users(_: unknown, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.users(claims.roles?.includes('admin') === true);
  }

  @GrpcMethod('IdentityService', 'ImportEnrollmentsCsv')
  importEnrollments(data: { content?: Buffer; filename?: string }, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.importEnrollments(
      Buffer.from(data?.content || ''),
      data?.filename || '',
      claims.roles?.includes('admin') === true,
    );
  }

  private requirePermission(metadata: Metadata, permission: string): void {
    const claims = this.auth.verify(metadata);
    if (!claims.roles?.includes('gateway') || !claims.permissions?.includes(permission)) {
      this.auth.denied('Permiso interno requerido');
    }
  }
}
