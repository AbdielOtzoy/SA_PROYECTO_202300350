import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../config/app-config';

export const SESSION_COOKIE = 'yousac_session';

export interface SessionClaims extends jwt.JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface SessionContext {
  token: string;
  claims: SessionClaims;
}

@Injectable()
export class SessionService {
  constructor(private readonly config: AppConfig) {}

  require(request: Request): SessionContext {
    const token = request.cookies?.[SESSION_COOKIE] || this.bearerToken(request);
    if (!token) throw new UnauthorizedException();
    try {
      return { token, claims: jwt.verify(token, this.config.jwtSecret) as SessionClaims };
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
  }

  requireAdmin(request: Request): SessionContext {
    const current = this.require(request);
    if (!current.claims.roles?.includes('admin')) {
      throw new ForbiddenException('Se requiere rol administrador');
    }
    return current;
  }

  set(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
  }

  clear(response: Response): void {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
  }

  private bearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    return authorization?.replace(/^Bearer\s+/i, '');
  }
}
