import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { EnrollmentsService } from './enrollments.service';
import type { EnrollmentsQuery } from './dto/enrollments.dto';

@Controller('api/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get()
  list(@Req() request: Request, @Query() query: EnrollmentsQuery) {
    return this.enrollments.list(request, query);
  }
}
