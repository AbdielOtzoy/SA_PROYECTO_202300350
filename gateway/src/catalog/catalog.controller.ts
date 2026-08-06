import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CatalogService } from './catalog.service';
import type { CatalogQuery, VoteBody } from './dto/catalog.dto';

@Controller('api/catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Req() request: Request, @Query() query: CatalogQuery) {
    return this.catalog.list(request, query);
  }

  @Get(':id')
  detail(@Req() request: Request, @Param('id') id: string) {
    return this.catalog.detail(request, id);
  }

  @Put(':id/rating')
  vote(@Req() request: Request, @Param('id') id: string, @Body() body: VoteBody) {
    return this.catalog.vote(request, id, body);
  }
}
