import 'reflect-metadata';
import {Controller, Module} from '@nestjs/common'; import {NestFactory} from '@nestjs/core'; import {Transport,GrpcMethod} from '@nestjs/microservices'; import {Pool} from 'pg'; import nodemailer from 'nodemailer'; import {join} from 'path'; import {verifyInternal} from './internal-auth';
const pool=new Pool({connectionString:process.env.NOTIFICATION_DATABASE_URL});
const smtp=nodemailer.createTransport({host:process.env.MAILPIT_HOST||'mailpit',port:Number(process.env.MAILPIT_PORT||1025),secure:false});
@Controller() class NotificationsGrpc { @GrpcMethod('NotificationService','Send') async send(data:any,metadata:any) { verifyInternal(metadata); await smtp.sendMail({from:'noreply@yousac.local',to:data.recipient,subject:data.subject,text:data.body}); await pool.query("INSERT INTO email_queue(user_id,recipient,params_json,status) VALUES($1,$2,$3,'sent')",[data.user_id || data.userId,data.recipient,JSON.stringify(data)]); return {accepted:true}; } }
@Module({controllers:[NotificationsGrpc]}) class AppModule{}
async function bootstrap(){const app=await NestFactory.createMicroservice(AppModule,{transport:Transport.GRPC,options:{package:'yousac.notifications.v1',protoPath:join(process.env.PROTO_DIR || join(process.cwd(),'proto'),'notifications.proto'),url:process.env.NOTIFICATIONS_GRPC_BIND || '0.0.0.0:50055'}});await app.listen();} bootstrap();
