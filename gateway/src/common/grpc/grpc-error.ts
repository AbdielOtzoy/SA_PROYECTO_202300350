import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  ForbiddenException,
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

interface GrpcErrorShape {
  code?: unknown;
  details?: unknown;
  message?: unknown;
}

export class GrpcHttpException extends HttpException {
  constructor(
    public readonly grpcCode: number,
    status: number,
    message: string,
  ) {
    super({ statusCode: status, message }, status);
  }
}

export class GrpcErrorMapper {
  toHttp(error: unknown): GrpcHttpException {
    const shape = this.shape(error);
    const code = typeof shape.code === 'number' ? shape.code : -1;
    const details = typeof shape.details === 'string' ? shape.details : '';
    switch (code) {
      case 3:
        return new GrpcHttpException(code, 400, details || 'Solicitud inválida');
      case 16:
        return new GrpcHttpException(code, 401, details || 'No autenticado');
      case 6:
        return new GrpcHttpException(code, 409, details || 'El recurso ya existe');
      case 7:
        return new GrpcHttpException(code, 403, details || 'Sin permisos');
      case 5:
        return new GrpcHttpException(code, 404, details || 'Recurso no encontrado');
      case 4:
        return new GrpcHttpException(code, 504, 'La operación interna excedió el tiempo de espera');
      case 14:
        return new GrpcHttpException(code, 503, 'Servicio interno no disponible');
      default:
        return new GrpcHttpException(code, 502, 'No fue posible completar la operación interna');
    }
  }

  httpStatus(error: unknown): number {
    return this.toHttp(error).getStatus();
  }

  private shape(error: unknown): GrpcErrorShape {
    if (typeof error !== 'object' || error === null) return {};
    const value = error as Record<string, unknown>;
    return { code: value.code, details: value.details, message: value.message };
  }
}

@Catch(GrpcHttpException)
export class GrpcExceptionFilter implements ExceptionFilter<GrpcHttpException> {
  catch(exception: GrpcHttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}

// Kept as named constructors for unit tests and for callers that need the
// same HTTP semantics outside the filter boundary.
export const grpcHttpExceptions = {
  badRequest: (message: string) => new BadRequestException(message),
  unauthorized: (message: string) => new UnauthorizedException(message),
  conflict: (message: string) => new ConflictException(message),
  forbidden: (message: string) => new ForbiddenException(message),
  notFound: (message: string) => new NotFoundException(message),
  timeout: (message: string) => new GatewayTimeoutException(message),
  unavailable: (message: string) => new ServiceUnavailableException(message),
  badGateway: (message: string) => new BadGatewayException(message),
};
