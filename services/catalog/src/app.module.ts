import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { AppConfig } from './common/config/app-config';
import { InternalAuthService } from './common/auth/internal-auth.service';
import { CATALOG_POOL } from './common/database/database.tokens';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogRepository } from './catalog/catalog.repository';
import { CatalogService } from './catalog/catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [
    AppConfig,
    InternalAuthService,
    CatalogRepository,
    CatalogService,
    {
      provide: CATALOG_POOL,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new Pool({ connectionString: config.databaseUrl }),
    },
  ],
})
export class AppModule {}
