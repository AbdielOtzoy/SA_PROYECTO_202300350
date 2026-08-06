import { RpcException } from '@nestjs/microservices';

export function grpcError(code: number, details: string): RpcException {
  return new RpcException({ code, details, message: details });
}
