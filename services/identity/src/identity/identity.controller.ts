import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { InternalAuthService } from '../common/auth/internal-auth.service';
import type {
  ChangeRoleRequest,
  EnrollmentsRequest,
  LoginRequest,
  OAuthLoginRequest,
  RegisterRequest,
  SessionRequest,
} from './dto/identity.dto';
import { IdentityService } from './identity.service';

@Controller()
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly auth: InternalAuthService,
  ) {}

  @GrpcMethod('IdentityService', 'Register') register(data: RegisterRequest) {
    return this.identity.register(data);
  }
  @GrpcMethod('IdentityService', 'Login') login(data: LoginRequest) {
    return this.identity.login(data);
  }
  @GrpcMethod('IdentityService', 'OAuthLogin') oauthLogin(data: OAuthLoginRequest) {
    return this.identity.oauthLogin(data);
  }

  @GrpcMethod('IdentityService', 'GetSession')
  session(data: SessionRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.session(data, claims.sub);
  }

  @GrpcMethod('IdentityService', 'ListEnrollments')
  enrollments(data: EnrollmentsRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.enrollments(data, claims.sub, claims.roles?.includes('admin') === true);
  }

  @GrpcMethod('IdentityService', 'ChangeRole')
  role(data: ChangeRoleRequest, metadata: Metadata) {
    const claims = this.auth.verify(metadata);
    return this.identity.changeRole(data, claims.roles?.includes('admin') === true);
  }
}
