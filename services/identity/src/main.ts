import 'reflect-metadata';
import { Controller, Module, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, GrpcMethod } from '@nestjs/microservices';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {randomBytes} from 'crypto';
import { join } from 'path';
import { verifyInternal } from './internal-auth';

const pool = new Pool({ connectionString: process.env.IDENTITY_DATABASE_URL });
const secret = process.env.JWT_SECRET || '';
if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
const domains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ingenieria.usac.edu.gt,ing.usac.edu.gt').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const validInstitutionalEmail = (email: string) => /^[^\s@]+@[^\s@]+$/.test(email) && domains.includes(email.split('@')[1]?.toLowerCase());

@Injectable()
class IdentityDomain {
  async user(id: string) {
    const result = await pool.query(`SELECT u.id,u.email,u.full_name,COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),'{}') roles,COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL),'{}') permissions FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE u.id=$1 AND u.is_active GROUP BY u.id`, [id]);
    if (!result.rowCount) throw new Error('Cuenta no encontrada');
    const row=result.rows[0]; return {id:row.id,email:row.email,fullName:row.full_name,roles:row.roles,permissions:row.permissions};
  }
  async token(user: any) { return jwt.sign({ sub: user.id, email: user.email, roles: user.roles, permissions: user.permissions }, secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] }); }
  async register(input: any) {
    if (!validInstitutionalEmail(input.email)) throw new Error('El correo debe pertenecer a un dominio institucional permitido');
    const fullName=input.full_name || input.fullName; if (!input.password || input.password.length < 8 || !fullName) throw new Error('Datos obligatorios inválidos');
    const hash = await bcrypt.hash(input.password, 12);
    try {
      const created = await pool.query('INSERT INTO users(email,password_hash,full_name) VALUES($1,$2,$3) RETURNING id', [input.email.toLowerCase(), hash, fullName]);
      const student = await pool.query("SELECT id FROM roles WHERE name='student'");
      await pool.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [created.rows[0].id, student.rows[0].id]);
      const user = await this.user(created.rows[0].id); return { token: await this.token(user), user, created:true };
    } catch (error: any) { if (error.code === '23505') throw new Error('El correo ya está registrado'); throw error; }
  }
  async login(input: any) {
    if (!validInstitutionalEmail(input.email || '')) throw new Error('El correo debe pertenecer a un dominio institucional permitido');
    const result = await pool.query('SELECT id,password_hash FROM users WHERE email=$1 AND is_active', [input.email?.toLowerCase()]);
    if (!result.rowCount || !(await bcrypt.compare(input.password || '', result.rows[0].password_hash))) throw new Error('Credenciales inválidas');
    const user = await this.user(result.rows[0].id); return { token: await this.token(user), user };
  }
  async oauthLogin(input:any) {
    const email = String(input.email || '').trim().toLowerCase();
    if (!input.verified || !validInstitutionalEmail(email)) throw new Error('La identidad OAuth no pertenece a un dominio institucional permitido');
    const fullName = String(input.full_name || '').trim().slice(0, 150) || email.split('@')[0].slice(0, 150);
    const existing = await pool.query('SELECT id FROM users WHERE email=$1 AND is_active', [email]);
    if (existing.rowCount) {
      await pool.query('UPDATE users SET full_name=$2, updated_at=now() WHERE id=$1', [existing.rows[0].id, fullName]);
      const user = await this.user(existing.rows[0].id); return {token:await this.token(user),user,created:false};
    }
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const created = await pool.query('INSERT INTO users(email,password_hash,full_name) VALUES($1,$2,$3) RETURNING id', [email, passwordHash, fullName]);
    const student = await pool.query("SELECT id FROM roles WHERE name='student'");
    await pool.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [created.rows[0].id, student.rows[0].id]);
    const user = await this.user(created.rows[0].id); return {token:await this.token(user),user,created:true};
  }
}
@Controller()
class IdentityGrpc {
  constructor(private readonly domain: IdentityDomain) {}
  @GrpcMethod('IdentityService', 'Register') register(data: any) { return this.domain.register(data); }
  @GrpcMethod('IdentityService', 'Login') login(data: any) { return this.domain.login(data); }
  @GrpcMethod('IdentityService', 'OAuthLogin') oauthLogin(data: any) { return this.domain.oauthLogin(data); }
  @GrpcMethod('IdentityService', 'GetSession') async session(data: any, metadata:any) { const userId=data.user_id || data.userId,claims=verifyInternal(metadata); if(claims.sub!==userId) throw new Error('Sesión ajena'); return { user: await this.domain.user(userId) }; }
  @GrpcMethod('IdentityService', 'ListEnrollments') async enrollments(data: any, metadata:any) { const userId=data.user_id || data.userId,claims=verifyInternal(metadata); if(claims.sub!==userId&&!claims.roles?.includes('admin')) throw new Error('Inscripción ajena'); const q = await pool.query('SELECT course_id,semester_id,status,credentials FROM user_enrollments WHERE user_id=$1 AND ($2=\'\' OR status=$2) AND ($3=\'\' OR credentials=$3)', [userId,data.status||'',data.credentials||'']); return { enrollments:q.rows.map(x=>({courseId:x.course_id,semesterId:x.semester_id,status:x.status,credentials:x.credentials})) }; }
  @GrpcMethod('IdentityService', 'ChangeRole') async role(data: any, metadata:any) { const claims=verifyInternal(metadata),userId=data.user_id || data.userId; if(!claims.roles?.includes('admin')) throw new Error('Rol administrador requerido'); await pool.query('CALL set_user_role($1,$2,$3,$4)', [userId,data.role,data.assign,data.actor_id || data.actorId]); return { user: await this.domain.user(userId) }; }
}
@Module({controllers:[IdentityGrpc],providers:[IdentityDomain]}) class AppModule {}
async function bootstrap() { const app = await NestFactory.createMicroservice(AppModule,{transport:Transport.GRPC,options:{package:'yousac.identity.v1',protoPath:join(process.env.PROTO_DIR || join(process.cwd(),'proto'),'identity.proto'),url:process.env.IDENTITY_GRPC_BIND || '0.0.0.0:50051'}}); await app.listen(); }
bootstrap();
export { validInstitutionalEmail };
