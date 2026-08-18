export interface RegisterRequest {
  email?: string;
  password?: string;
  full_name?: string;
  fullName?: string;
}

export interface LoginRequest {
  email?: string;
  password?: string;
}

export interface OAuthLoginRequest {
  email?: string;
  full_name?: string;
  fullName?: string;
  verified?: boolean;
}

export interface PasswordResetRequest {
  email?: string;
}

export interface PasswordResetReply {
  accepted: boolean;
  user_id?: string;
  recipient?: string;
  reset_token?: string;
}

export interface ResetPasswordRequest {
  token?: string;
  new_password?: string;
  newPassword?: string;
}

export interface PasswordResetResult {
  accepted: boolean;
  user: UserMessage;
}

export interface SessionRequest {
  user_id?: string;
  userId?: string;
}

export interface EnrollmentsRequest extends SessionRequest {
  semester?: string;
  status?: string;
  credentials?: string;
}

export interface ChangeRoleRequest extends SessionRequest {
  role?: string;
  assign?: boolean;
  actor_id?: string;
  actorId?: string;
}

export interface UserMessage {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface AuthReply {
  token: string;
  user: UserMessage;
  created?: boolean;
}

export interface SessionReply {
  user: UserMessage;
}

export interface EnrollmentMessage {
  courseId: string;
  semesterId: string;
  status: string;
  credentials: string;
}

export interface EnrollmentsReply {
  enrollments: EnrollmentMessage[];
}

export interface NotificationRecipientsRequest {
  role?: string;
  course_id?: string;
  courseId?: string;
  status?: string;
}

export interface NotificationRecipientMessage {
  userId: string;
  recipient: string;
  fullName: string;
}

export interface NotificationRecipientsReply {
  recipients: NotificationRecipientMessage[];
}
export interface RoleReply {
  user: UserMessage;
}

export interface UsersReply {
  users: UserMessage[];
}
