import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import { join } from 'path';
const protoRoot=process.env.PROTO_DIR || join(process.cwd(),'proto');
const definition=(name:string)=>loader.loadSync(join(protoRoot,`${name}.proto`),{keepCase:true,defaults:true,oneofs:true});
const make=(file:string,pkg:string,service:string,address:string)=>{const loaded:any=grpc.loadPackageDefinition(definition(file));return new loaded.yousac[pkg].v1[service](address,grpc.credentials.createInsecure());};
export const clients={identity:make('identity','identity','IdentityService','identity:50051'),catalog:make('catalog','catalog','CatalogService','catalog:50052'),playback:make('playback','playback','PlaybackService','playback:50053'),analytics:make('analytics','analytics','AnalyticsService','analytics:50054'),notifications:make('notifications','notifications','NotificationService','notifications:50055')};
export const unary=(client:any,method:string,data:any,token?:string):Promise<any>=>new Promise((resolve,reject)=>{const md=new grpc.Metadata();if(token)md.set('authorization',`Bearer ${token}`);client[method](data,md,(error:Error,value:any)=>error?reject(error):resolve(value));});
