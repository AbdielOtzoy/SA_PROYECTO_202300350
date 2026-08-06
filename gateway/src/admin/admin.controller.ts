import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';

interface RoleBody {
  role?: string;
  assign?: boolean;
}

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
  ) {}

  @Get('analytics/most-viewed')
  mostViewed(@Req() request: Request, @Query('week_start') weekStart?: string) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary('analytics', 'MostViewed', { week_start: weekStart || '' }, current.token);
  }

  @Put('users/:id/roles')
  role(@Req() request: Request, @Param('id') userId: string, @Body() body: RoleBody) {
    const current = this.session.requireAdmin(request);
    return this.grpc.unary(
      'identity',
      'ChangeRole',
      {
        user_id: userId,
        role: body.role || '',
        assign: !!body.assign,
        actor_id: current.claims.sub,
      },
      current.token,
    );
  }
}
