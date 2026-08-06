export interface SendRequest {
  user_id?: string;
  userId?: string;
  recipient?: string;
  type?: string;
  subject?: string;
  body?: string;
}

export interface SendReply {
  accepted: boolean;
}
