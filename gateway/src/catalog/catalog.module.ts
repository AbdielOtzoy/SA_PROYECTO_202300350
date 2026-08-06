import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CommonModule } from '../common/common.module';

@Module({ imports: [CommonModule], controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
