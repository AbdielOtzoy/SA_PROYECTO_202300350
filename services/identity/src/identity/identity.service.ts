import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../common/config/app-config';
import { grpcError } from '../common/grpc/grpc-errors';
import type {
  ChangeRoleRequest,
  EnrollmentsReply,
  EnrollmentsRequest,
  AuthReply,
  LoginRequest,
  OAuthLoginRequest,
  RegisterRequest,
  RoleReply,
  SessionReply,
  SessionRequest,
  UsersReply,
  NotificationRecipientsRequest,
  NotificationRecipientsReply,
  PasswordResetReply,
  PasswordResetRequest,
  PasswordResetResult,
  ResetPasswordRequest,
} from './dto/identity.dto';
import { IdentityRepository } from './identity.repository';
import { toUserMessage } from './mappers/user.mapper';
import { validInstitutionalEmail } from './validation';
import { csvRows, required, uuidValue } from './csv';

@Injectable()
export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly config: AppConfig,
  ) {}

  async user(id: string) {
    const row = await this.repository.findUser(id);
    if (!row) throw grpcError(GrpcStatus.NOT_FOUND, 'Cuenta no encontrada');
    return toUserMessage(row);
  }

  async users(isAdmin: boolean): Promise<UsersReply> {
    if (!isAdmin) throw grpcError(GrpcStatus.PERMISSION_DENIED, 'Rol administrador requerido');
    return { users: (await this.repository.listUsers()).map(toUserMessage) };
  }

  async register(input: RegisterRequest): Promise<AuthReply> {
    const email = String(input.email || '')
      .trim()
      .toLowerCase();
    const fullName = input.full_name || input.fullName || '';
    if (!validInstitutionalEmail(email, this.config.emailDomains)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El correo debe pertenecer a un dominio institucional permitido');
    }
    if (!input.password || input.password.length < 8 || !fullName) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Datos obligatorios inválidos');
    }
    const hash = await bcrypt.hash(input.password, 12);
    try {
      const id = await this.repository.createUser(email, hash, fullName);
      await this.repository.assignRole(id, await this.repository.studentRoleId());
      const user = await this.user(id);
      return { token: await this.token(user), user, created: true };
    } catch (error: unknown) {
      if (this.repository.isDuplicate(error))
        throw grpcError(GrpcStatus.ALREADY_EXISTS, 'El correo ya está registrado');
      throw error;
    }
  }

  async login(input: LoginRequest): Promise<AuthReply> {
    const email = String(input.email || '')
      .trim()
      .toLowerCase();
    if (!validInstitutionalEmail(email, this.config.emailDomains)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El correo debe pertenecer a un dominio institucional permitido');
    }
    const credentials = await this.repository.findCredentials(email);
    if (!credentials || !(await bcrypt.compare(input.password || '', credentials.password_hash))) {
      throw grpcError(GrpcStatus.UNAUTHENTICATED, 'Credenciales inválidas');
    }
    const user = await this.user(credentials.id);
    return { token: await this.token(user), user };
  }

  async oauthLogin(input: OAuthLoginRequest): Promise<AuthReply> {
    const email = String(input.email || '')
      .trim()
      .toLowerCase();
    if (!input.verified || !validInstitutionalEmail(email, this.config.emailDomains)) {
      throw grpcError(
        GrpcStatus.PERMISSION_DENIED,
        'La identidad OAuth no pertenece a un dominio institucional permitido',
      );
    }
    const fullName =
      String(input.full_name || input.fullName || '')
        .trim()
        .slice(0, 150) || email.split('@')[0].slice(0, 150);
    const existingId = await this.repository.findActiveUserId(email);
    if (existingId) {
      await this.repository.updateFullName(existingId, fullName);
      const user = await this.user(existingId);
      return { token: await this.token(user), user, created: false };
    }
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const id = await this.repository.createUser(email, passwordHash, fullName);
    await this.repository.assignRole(id, await this.repository.studentRoleId());
    const user = await this.user(id);
    return { token: await this.token(user), user, created: true };
  }

  async requestPasswordReset(input: PasswordResetRequest): Promise<PasswordResetReply> {
    const email = String(input.email || '')
      .trim()
      .toLowerCase();
    const generic: PasswordResetReply = { accepted: true };
    if (!validInstitutionalEmail(email, this.config.emailDomains)) return generic;
    const user = await this.repository.findResetRecipient(email);
    if (!user) return generic;
    const resetToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.config.passwordResetTtlMinutes * 60 * 1000);
    await this.repository.createPasswordResetToken(user.id, tokenHash, expiresAt);
    return { accepted: true, user_id: user.id, recipient: user.email, reset_token: resetToken };
  }

  async resetPassword(input: ResetPasswordRequest): Promise<PasswordResetResult> {
    const token = String(input.token || '').trim();
    const password = String(input.new_password || input.newPassword || '');
    if (!token || password.length < 8) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El mecanismo o la contraseña son inválidos');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.repository.consumePasswordReset(
      createHash('sha256').update(token).digest('hex'),
      passwordHash,
    );
    if (!user) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El mecanismo de recuperación es inválido o venció');
    return { accepted: true, user: await this.user(user.id) };
  }

  async session(input: SessionRequest, userId: string): Promise<SessionReply> {
    if (userId !== (input.user_id || input.userId)) throw grpcError(GrpcStatus.PERMISSION_DENIED, 'Sesión ajena');
    return { user: await this.user(userId) };
  }

  async enrollments(input: EnrollmentsRequest, userId: string, isAdmin: boolean): Promise<EnrollmentsReply> {
    const requested = input.user_id || input.userId || '';
    const semester = String(input.semester || '').trim();
    if (!requested) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'La cuenta de inscripción es obligatoria');
    if (userId !== requested && !isAdmin) throw grpcError(GrpcStatus.PERMISSION_DENIED, 'Inscripción ajena');
    if (semester && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(semester)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El semestre debe ser un UUID válido');
    }
    return {
      enrollments: await this.repository.listEnrollments(
        requested,
        semester,
        String(input.status || '').trim(),
        String(input.credentials || '').trim(),
      ),
    };
  }

  notificationRecipients(input: NotificationRecipientsRequest): Promise<NotificationRecipientsReply> {
    const role = String(input.role || '')
      .trim()
      .toLowerCase();
    const courseId = String(input.course_id || input.courseId || '').trim();
    const status = String(input.status || '').trim();
    if ((role && courseId) || (!role && !courseId)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Debe indicar un rol o un curso, pero no ambos');
    }
    if (role && !['student', 'teacher', 'assistant', 'admin'].includes(role)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Rol de audiencia inválido');
    }
    if (courseId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El curso debe ser un UUID válido');
    }
    return this.repository.listNotificationRecipients(role, courseId, status).then((recipients) => ({
      recipients: recipients.map((recipient) => ({
        userId: recipient.user_id,
        recipient: recipient.recipient,
        fullName: recipient.full_name,
      })),
    }));
  }

  async changeRole(input: ChangeRoleRequest, isAdmin: boolean): Promise<RoleReply> {
    if (!isAdmin) throw grpcError(GrpcStatus.PERMISSION_DENIED, 'Rol administrador requerido');
    const userId = input.user_id || input.userId || '';
    await this.repository.changeRole(userId, input.role || '', !!input.assign, input.actor_id || input.actorId || '');
    return { user: await this.user(userId) };
  }

  async importEnrollments(content: Buffer, filename: string, isAdmin: boolean) {
    if (!isAdmin) throw grpcError(GrpcStatus.PERMISSION_DENIED, 'Rol administrador requerido');
    if (!filename.toLowerCase().endsWith('.csv')) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'Solo se permiten archivos .csv');
    }
    const rows = csvRows(content, ['user_email', 'course_id', 'semester_id', 'status', 'credentials']).map(
      (row, index) => ({
        user_email: required(row.user_email, 'user_email', index + 2),
        course_id: uuidValue(row.course_id, 'course_id', index + 2),
        semester_id: uuidValue(row.semester_id, 'semester_id', index + 2),
        status: required(row.status, 'status', index + 2),
        credentials: String(row.credentials || '').trim(),
      }),
    );
    try {
      await this.repository.importEnrollments(rows);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : 'El Stored Procedure rechazó la importación';
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, message);
    }
    return { accepted: true, rows: rows.length, procedure: 'sp_import_enrollments_csv' };
  }

  private token(user: { id: string; email: string; roles: string[]; permissions: string[] }): Promise<string> {
    return Promise.resolve(
      jwt.sign(
        { sub: user.id, email: user.email, roles: user.roles, permissions: user.permissions },
        this.config.jwtSecret,
        { expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
      ),
    );
  }
}
