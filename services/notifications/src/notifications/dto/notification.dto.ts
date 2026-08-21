export interface SendRequest {
  user_id?: string;
  userId?: string;
  recipient?: string;
  type?: string;
  subject?: string;
  body?: string;
  template_code?: string;
  templateCode?: string;
  params_json?: string;
  paramsJson?: string;
}

export interface SendReply {
  accepted: boolean;
  queue_id?: string;
  queued?: number;
}

export interface NotificationRecipient {
  user_id?: string;
  userId?: string;
  recipient?: string;
}

export interface SendBatchRequest {
  type?: string;
  template_code?: string;
  templateCode?: string;
  subject?: string;
  body?: string;
  params_json?: string;
  paramsJson?: string;
  recipients?: NotificationRecipient[];
}

export interface SendBatchReply {
  accepted: boolean;
  queued: number;
}

export interface PreferencesRequest {
  user_id?: string;
  userId?: string;
}

export interface UpdatePreferencesRequest extends PreferencesRequest {
  new_recording?: boolean;
  admin_notice?: boolean;
}

export interface PreferencesReply {
  new_recording: boolean;
  admin_notice: boolean;
  recovery: boolean;
  security: boolean;
}
