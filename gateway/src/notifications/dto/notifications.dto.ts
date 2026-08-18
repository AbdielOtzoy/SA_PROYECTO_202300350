export interface PreferencesBody {
  new_recording?: boolean;
  admin_notice?: boolean;
}

export interface AdminNoticeBody {
  target_type?: string;
  target_value?: string;
  subject?: string;
  body?: string;
}
