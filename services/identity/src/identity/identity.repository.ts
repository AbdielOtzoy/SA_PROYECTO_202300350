import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { IDENTITY_POOL } from '../common/database/database.tokens';
import type { EnrollmentMessage } from './dto/identity.dto';
import type { UserRow } from './mappers/user.mapper';

interface CredentialsRow {
  id: string;
  password_hash: string;
}
interface IdRow {
  id: string;
}
interface EnrollmentRow {
  course_id: string;
  semester_id: string;
  status: string;
  credentials: string;
}

interface ImportRow {
  user_email: string;
  course_id: string;
  semester_id: string;
  status: string;
  credentials: string;
}

@Injectable()
export class IdentityRepository {
  constructor(@Inject(IDENTITY_POOL) private readonly pool: Pool) {}

  async findUser(id: string): Promise<UserRow | undefined> {
    const result = await this.pool.query<UserRow>(
      `SELECT u.id,
              u.email,
              u.full_name,
              u.is_active,
              COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') roles,
              COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') permissions
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = $1 AND u.is_active
        GROUP BY u.id`,
      [id],
    );
    return result.rows[0];
  }

  async listUsers(): Promise<UserRow[]> {
    const result = await this.pool.query<UserRow>(
      `SELECT u.id,
              u.email,
              u.full_name,
              u.is_active,
              COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') roles,
              COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') permissions
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
        GROUP BY u.id
        ORDER BY u.full_name`,
    );
    return result.rows;
  }

  async findCredentials(email: string): Promise<CredentialsRow | undefined> {
    const result = await this.pool.query<CredentialsRow>(
      'SELECT id,password_hash FROM users WHERE email=$1 AND is_active',
      [email],
    );
    return result.rows[0];
  }

  async createUser(email: string, passwordHash: string, fullName: string): Promise<string> {
    const result = await this.pool.query<IdRow>(
      'INSERT INTO users(email,password_hash,full_name) VALUES($1,$2,$3) RETURNING id',
      [email, passwordHash, fullName],
    );
    return result.rows[0].id;
  }

  async studentRoleId(): Promise<string> {
    const result = await this.pool.query<IdRow>("SELECT id FROM roles WHERE name='student'");
    return result.rows[0].id;
  }

  assignRole(userId: string, roleId: string): Promise<unknown> {
    return this.pool.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [userId, roleId]);
  }

  async findActiveUserId(email: string): Promise<string | undefined> {
    const result = await this.pool.query<IdRow>('SELECT id FROM users WHERE email=$1 AND is_active', [email]);
    return result.rows[0]?.id;
  }

  updateFullName(id: string, fullName: string): Promise<unknown> {
    return this.pool.query('UPDATE users SET full_name=$2, updated_at=now() WHERE id=$1', [id, fullName]);
  }

  async listEnrollments(userId: string, status: string, credentials: string): Promise<EnrollmentMessage[]> {
    const result = await this.pool.query<EnrollmentRow>(
      "SELECT course_id,semester_id,status,credentials FROM user_enrollments WHERE user_id=$1 AND ($2='' OR status=$2) AND ($3='' OR credentials=$3)",
      [userId, status, credentials],
    );
    return result.rows.map((row) => ({
      courseId: row.course_id,
      semesterId: row.semester_id,
      status: row.status,
      credentials: row.credentials,
    }));
  }

  changeRole(userId: string, role: string, assign: boolean, actorId: string): Promise<unknown> {
    return this.pool.query('CALL set_user_role($1,$2,$3,$4)', [userId, role, assign, actorId]);
  }

  importEnrollments(rows: ImportRow[]): Promise<unknown> {
    return this.pool.query('CALL sp_import_enrollments_csv($1::jsonb)', [JSON.stringify(rows)]);
  }

  isDuplicate(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
  }
}
