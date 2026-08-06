import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { AppConfig } from './common/config/app-config';
import { IDENTITY_POOL } from './common/database/database.tokens';
import { InternalAuthService } from './common/auth/internal-auth.service';
import { IdentityController } from './identity/identity.controller';
import { IdentityRepository } from './identity/identity.repository';
import { IdentityService } from './identity/identity.service';

@Module({
  controllers: [IdentityController],
  providers: [
    AppConfig,
    InternalAuthService,
    IdentityRepository,
    IdentityService,
    {
      provide: IDENTITY_POOL,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new Pool({ connectionString: config.databaseUrl }),
    },
  ],
})
export class AppModule {}
