import * as jwt from 'jsonwebtoken';
export function verifyInternal(metadata:any){const value=metadata?.get?.('authorization')?.[0];if(typeof value!=='string')throw new Error('JWT interno requerido');return jwt.verify(value.replace(/^Bearer\s+/i,''),process.env.JWT_SECRET||'development-secret-must-be-replaced') as any;}
