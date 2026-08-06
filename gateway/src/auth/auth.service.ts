import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import type { Request } from 'express';
import { AppConfig } from '../common/config/app-config';
import { GrpcCallService } from '../common/grpc/grpc.client';
import type { AuthReply, LoginRequest, RegisterRequest, SessionReply, RegistrationNotification } from './dto/auth.dto';
import { createOAuthState, validInstitutionalEmail } from './oauth';
import type { AuthProfile, NotificationReply } from '../common/grpc/grpc.types';
import { SessionService } from '../common/auth/session.service';

export const OAUTH_STATE_COOKIE = 'yousac_oauth_state';

@Injectable()
export class AuthService {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly config: AppConfig,
    private readonly session: SessionService,
  ) {}

  async register(input: RegisterRequest): Promise<AuthReply> {
    this.requireInstitutionalEmail(input.email || '');
    const reply = await this.grpc.unary<RegisterRequest, AuthReply>('identity', 'Register', input);
    this.notifyRegistration(reply);
    return reply;
  }

  async login(input: LoginRequest): Promise<AuthReply> {
    this.requireInstitutionalEmail(input.email || '');
    return this.grpc.unary<LoginRequest, AuthReply>('identity', 'Login', input);
  }

  googleAuthorization(): { state: string; url: string } {
    const { client } = this.googleClient();
    const state = createOAuthState();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      include_granted_scopes: true,
      state,
      prompt: 'select_account',
    });
    return { state, url };
  }

  async googleLogin(code: string): Promise<AuthReply> {
    const { client, clientId } = this.googleClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new BadRequestException('Google no devolvió una identidad verificable');
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase() || '';
    const profile: AuthProfile = {
      email,
      name: payload?.name || email.split('@')[0],
      verified: payload?.email_verified === true,
    };
    if (!profile.verified || !validInstitutionalEmail(profile.email)) {
      throw new BadRequestException('La cuenta no pertenece a un dominio institucional permitido');
    }
    const reply = await this.grpc.unary<{ email: string; full_name: string; verified: boolean }, AuthReply>(
      'identity',
      'OAuthLogin',
      { email: profile.email, full_name: profile.name, verified: true },
    );
    this.notifyRegistration(reply);
    return reply;
  }

  async current(request: Request): Promise<SessionReply> {
    const current = this.session.require(request);
    return this.grpc.unary<{ user_id: string }, SessionReply>(
      'identity',
      'GetSession',
      { user_id: current.claims.sub },
      current.token,
    );
  }

  logout(): { ok: true } {
    return { ok: true };
  }

  oauthSuccessUrl(): string {
    return this.config.oauthSuccessUrl;
  }
  oauthFailureUrl(): string {
    return this.config.oauthFailureUrl;
  }

  private requireInstitutionalEmail(email: string): void {
    if (!validInstitutionalEmail(email)) {
      throw new BadRequestException('El correo debe pertenecer a @ingenieria.usac.edu.gt o @ing.usac.edu.gt');
    }
  }

  private googleClient(): { client: OAuth2Client; clientId: string } {
    const {
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
      GOOGLE_CALLBACK_URL: redirectUri,
    } = process.env;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException('OAuth institucional no está configurado');
    }
    const client = new OAuth2Client({ clientId, clientSecret, redirectUri });
    return { client, clientId };
  }

  private notifyRegistration(reply: AuthReply): void {
    if (!reply.created) return;
    void this.grpc
      .unary<RegistrationNotification, NotificationReply>(
        'notifications',
        'Send',
        {
          user_id: reply.user.id,
          recipient: reply.user.email,
          type: 'registration',
          subject: 'Bienvenido a YoUSAC',
          body: 'Tu cuenta fue creada.',
        },
        reply.token,
      )
      .catch(() => undefined);
  }
}
