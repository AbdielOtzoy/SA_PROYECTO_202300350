import * as jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || '';
if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
export function verifyInternal(metadata:any){const value=metadata?.get?.('authorization')?.[0];if(typeof value!=='string')throw new Error('JWT interno requerido');return jwt.verify(value.replace(/^Bearer\s+/i,''),secret);}
