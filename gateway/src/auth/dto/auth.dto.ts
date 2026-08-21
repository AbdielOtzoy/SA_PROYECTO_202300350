import type {
  AuthReply,
  LoginRequest,
  PasswordResetReply,
  PasswordResetResult,
  RegisterRequest,
  UserMessage,
} from '../../common/grpc/grpc.types';

export type { AuthReply, LoginRequest, RegisterRequest, UserMessage };

export interface OAuthQuery {
  code?: string | string[];
  state?: string | string[];
}

export interface SessionReply {
  user: UserMessage;
}

export interface RegistrationNotification {
  user_id: string;
  recipient: string;
  type: string;
  subject: string;
  body: string;
}

export interface RecoveryRequest {
  email?: string;
}

export interface RecoveryResetRequest {
  token?: string;
  new_password?: string;
}

export interface RecoveryResponse {
  accepted: boolean;
  message: string;
}

export type { PasswordResetReply, PasswordResetResult };
