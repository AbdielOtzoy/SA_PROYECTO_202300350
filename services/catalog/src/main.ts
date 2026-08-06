import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AppConfig } from './common/config/app-config';

async function bootstrap(): Promise<void> {
  const config = new AppConfig();
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'yousac.catalog.v1',
      protoPath: `${config.protoDir}/catalog.proto`,
      url: config.grpcBind,
    },
  });
  await app.listen();
}

void bootstrap();
