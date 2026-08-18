import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../common/auth/session.service';
import { GrpcCallService } from '../common/grpc/grpc.client';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(
    private readonly grpc: GrpcCallService,
    private readonly session: SessionService,
  ) {}

  @Get('recommendations')
  recommendations(@Req() request: Request, @Query('limit') limit?: string) {
    const current = this.session.require(request);
    return this.grpc.unary(
      'analytics',
      'Recommendations',
      { user_id: current.claims.sub, limit: Math.min(10, Math.max(1, Number(limit || 10))) },
      current.token,
    );
  }

  @Get('trends/active')
  activeTrends(@Req() request: Request, @Query('limit') limit?: string) {
    const current = this.session.require(request);
    return this.grpc.unary(
      'analytics',
      'TrendingTopics',
      {
        period_id: '',
        start_at: '',
        end_at: '',
        limit: Math.min(10, Math.max(1, Number(limit || 10))),
        active_only: true,
      },
      current.token,
    );
  }
}
