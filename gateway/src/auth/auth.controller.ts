import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, OAUTH_STATE_COOKIE } from './auth.service';
import { SessionService } from '../common/auth/session.service';
import { sameOAuthState } from './oauth';
import type { LoginRequest, OAuthQuery, RecoveryRequest, RecoveryResetRequest, RegisterRequest } from './dto/auth.dto';

@Controller('api')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService,
  ) {}

  @Post('auth/register')
  async register(@Body() body: RegisterRequest, @Res({ passthrough: true }) response: Response) {
    const reply = await this.auth.register(body);
    this.session.set(response, reply.token);
    return { user: reply.user };
  }

  @Post('auth/login')
  async login(@Body() body: LoginRequest, @Res({ passthrough: true }) response: Response) {
    const reply = await this.auth.login(body);
    this.session.set(response, reply.token);
    return { user: reply.user };
  }

  @Post('auth/recovery/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestRecovery(@Body() body: RecoveryRequest) {
    return this.auth.requestRecovery(body);
  }

  @Post('auth/recovery/reset')
  resetRecovery(@Body() body: RecoveryResetRequest) {
    return this.auth.resetRecovery(body);
  }

  @Get('auth/google')
  googleStart(@Res() response: Response): void {
    const { state, url } = this.auth.googleAuthorization();
    response.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth/google',
      maxAge: 10 * 60 * 1000,
    });
    response.redirect(url);
  }

  @Get('auth/google/callback')
  async googleCallback(@Req() request: Request, @Res() response: Response, @Query() query: OAuthQuery): Promise<void> {
    const code = typeof query.code === 'string' ? query.code : undefined;
    const state = typeof query.state === 'string' ? query.state : undefined;
    if (!code || !sameOAuthState(request.cookies?.[OAUTH_STATE_COOKIE], state)) {
      response.status(400).send('Callback OAuth inválido');
      return;
    }
    response.clearCookie(OAUTH_STATE_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth/google',
    });
    try {
      const reply = await this.auth.googleLogin(code);
      this.session.set(response, reply.token);
      response.redirect(this.auth.oauthSuccessUrl());
    } catch {
      response.redirect(this.auth.oauthFailureUrl());
    }
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    this.session.clear(response);
    return this.auth.logout();
  }

  @Get('session')
  current(@Req() request: Request) {
    return this.auth.current(request);
  }
}
