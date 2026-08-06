import type { UserMessage } from '../dto/identity.dto';

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
}

export function toUserMessage(row: UserRow): UserMessage {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    roles: row.roles || [],
    permissions: row.permissions || [],
  };
}
