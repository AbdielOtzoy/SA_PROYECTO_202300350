import 'reflect-metadata';
import { Controller, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, GrpcMethod } from '@nestjs/microservices';
import { Pool } from 'pg';
import { join } from 'path';
import {verifyInternal} from './internal-auth';
const pool = new Pool({connectionString:process.env.CATALOG_DATABASE_URL});

function recording(row:any) { return {id:row.id,title:row.title,course:row.course,courseCode:row.course_code,school:row.school,semester:row.semester,unit:row.unit,topic:row.topic,videoPath:row.video_path,recommendation:Number(row.recommendation || 0)}; }
@Controller()
class CatalogGrpc {
  @GrpcMethod('CatalogService','ListRecordings')
  async list(data:any,metadata:any) { verifyInternal(metadata); const q=await pool.query(`SELECT * FROM published_catalog WHERE ($1='' OR title ILIKE '%' || $1 || '%' OR topic ILIKE '%' || $1 || '%' OR course ILIKE '%' || $1 || '%' OR course_code ILIKE '%' || $1 || '%') AND ($2='' OR school=$2) AND ($3='' OR course_code=$3) AND ($4='' OR semester=$4) ORDER BY title`,[data.query||'',data.school||'',data.course||'',data.semester||'']); return {recordings:q.rows.map(recording)}; }
  @GrpcMethod('CatalogService','GetRecording')
  async get(data:any,metadata:any) { verifyInternal(metadata); const q=await pool.query('SELECT * FROM recording_detail WHERE id=$1',[data.id]); if(!q.rows.length) throw new Error('Grabación no publicada'); return {recording:recording(q.rows[0])}; }
  @GrpcMethod('CatalogService','CanPlay')
  async canPlay(data:any,metadata:any) { verifyInternal(metadata); const q=await pool.query('SELECT video_path FROM recordings WHERE id=$1 AND is_published',[data.recording_id || data.recordingId]); return {allowed:q.rows.length>0,videoPath:q.rows[0]?.video_path||''}; }
  @GrpcMethod('CatalogService','Vote')
  async vote(data:any,metadata:any) { verifyInternal(metadata); const userId=data.user_id || data.userId,recordingId=data.recording_id || data.recordingId; await pool.query('INSERT INTO ratings(user_id,recording_id,vote) VALUES($1,$2,$3) ON CONFLICT(user_id,recording_id) DO UPDATE SET vote=EXCLUDED.vote',[userId,recordingId,data.vote]); const q=await pool.query(`SELECT COUNT(*) FILTER (WHERE vote)::int positives,COUNT(*)::int total,recommendation_percentage($1) recommendation FROM ratings WHERE recording_id=$1`,[recordingId]); return {...q.rows[0],recommendation:Number(q.rows[0].recommendation)}; }
}
@Module({controllers:[CatalogGrpc]}) class AppModule{}
async function bootstrap(){const app=await NestFactory.createMicroservice(AppModule,{transport:Transport.GRPC,options:{package:'yousac.catalog.v1',protoPath:join(process.env.PROTO_DIR || join(process.cwd(),'proto'),'catalog.proto'),url:'0.0.0.0:50052'}});await app.listen();} bootstrap();
