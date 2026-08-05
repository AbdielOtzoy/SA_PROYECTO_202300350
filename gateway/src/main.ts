import 'reflect-metadata';
import {BadRequestException, Body, Controller, Get, Module, Param, Post, Put, Query, Req, Res, UnauthorizedException, ForbiddenException, ServiceUnavailableException, NotFoundException, GatewayTimeoutException} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import {OAuth2Client} from 'google-auth-library';
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {clients, grpcDeadline, unary} from './grpc';
import {createOAuthState, sameOAuthState, validInstitutionalEmail} from './oauth';

const secret = process.env.JWT_SECRET || '';
if (!secret) throw new Error('JWT_SECRET debe estar definido en el entorno');
const cookie = 'yousac_session';
const oauthStateCookie = 'yousac_oauth_state';
const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:3000';
const oauthSuccessUrl = process.env.OAUTH_SUCCESS_URL || `${frontendUrl}/catalogo`;
const oauthFailureUrl = process.env.OAUTH_FAILURE_URL || `${frontendUrl}/?oauth=error`;
function googleClient() {
  const {GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_CALLBACK_URL: redirectUri} = process.env;
  if (!clientId || !clientSecret || !redirectUri) throw new ServiceUnavailableException('OAuth institucional no está configurado');
  return {client: new OAuth2Client({clientId, clientSecret, redirectUri}), clientId};
}
function session(req:any) { const token = req.cookies?.[cookie] || req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new UnauthorizedException(); try { return {token, claims:jwt.verify(token, secret) as any}; } catch { throw new UnauthorizedException('Sesión inválida o vencida'); } }
function admin(req:any) { const current = session(req); if (!current.claims.roles?.includes('admin')) throw new ForbiddenException('Se requiere rol administrador'); return current; }
function setSession(res:any, token:string) { res.cookie(cookie, token, {httpOnly:true,secure:true,sameSite:'strict',path:'/'}); }
function notifyRegistration(reply:any) { if (!reply.created) return; unary(clients.notifications, 'Send', {user_id:reply.user.id, recipient:reply.user.email, type:'registration', subject:'Bienvenido a YoUSAC', body:'Tu cuenta fue creada.'}, reply.token).catch(() => undefined); }
function grpcHttpError(error:any): never {
  switch (error?.code) {
    case 16: throw new UnauthorizedException(error.details || 'No autenticado');
    case 7: throw new ForbiddenException(error.details || 'Sin permisos');
    case 5: throw new NotFoundException(error.details || 'Recurso no encontrado');
    case 4: throw new GatewayTimeoutException('La operación interna excedió el tiempo de espera');
    case 14: throw new ServiceUnavailableException('Servicio interno no disponible');
    default: throw error;
  }
}

@Controller('api') class Api {
  @Post('auth/register') async register(@Body() data:any, @Res({passthrough:true}) res:any) { if (!validInstitutionalEmail(data.email || '')) throw new BadRequestException('El correo debe pertenecer a @ingenieria.usac.edu.gt o @ing.usac.edu.gt'); try { const reply = await unary(clients.identity, 'Register', data); setSession(res, reply.token); notifyRegistration(reply); return {user:reply.user}; } catch (error) { return grpcHttpError(error); } }
  @Post('auth/login') async login(@Body() data:any, @Res({passthrough:true}) res:any) { if (!validInstitutionalEmail(data.email || '')) throw new BadRequestException('El correo debe pertenecer a @ingenieria.usac.edu.gt o @ing.usac.edu.gt'); try { const reply = await unary(clients.identity, 'Login', data); setSession(res, reply.token); return {user:reply.user}; } catch (error) { return grpcHttpError(error); } }
  @Get('auth/google') googleStart(@Res() res:any) {
    const {client} = googleClient();
    const state = createOAuthState();
    res.cookie(oauthStateCookie, state, {httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/google',maxAge:10 * 60 * 1000});
    return res.redirect(client.generateAuthUrl({access_type:'offline',scope:['openid','email','profile'],include_granted_scopes:true,state,prompt:'select_account'}));
  }
  @Get('auth/google/callback') async googleCallback(@Req() req:any, @Res() res:any) {
    try {
      const {code,state} = req.query;
      if (typeof code !== 'string' || !sameOAuthState(req.cookies?.[oauthStateCookie], typeof state === 'string' ? state : undefined)) return res.status(400).send('Callback OAuth inválido');
      const {client,clientId} = googleClient();
      res.clearCookie(oauthStateCookie, {httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/google'});
      const {tokens} = await client.getToken(code);
      if (!tokens.id_token) return res.status(401).send('Google no devolvió una identidad verificable');
      const ticket = await client.verifyIdToken({idToken:tokens.id_token,audience:clientId});
      const payload = ticket.getPayload();
      const email = payload?.email?.trim().toLowerCase() || '';
      if (payload?.email_verified !== true || !validInstitutionalEmail(email)) return res.status(403).send('La cuenta no pertenece a un dominio institucional permitido');
      const reply = await unary(clients.identity, 'OAuthLogin', {email,full_name:payload?.name || email.split('@')[0],verified:true});
      setSession(res, reply.token);
      notifyRegistration(reply);
      return res.redirect(oauthSuccessUrl);
    } catch (error) {
      return res.redirect(oauthFailureUrl);
    }
  }
  @Post('auth/logout') logout(@Res({passthrough:true}) res:any) { res.clearCookie(cookie, {httpOnly:true,secure:true,sameSite:'strict',path:'/'}); return {ok:true}; }
  @Get('session') async getSession(@Req() req:any) { const current = session(req); try { return await unary(clients.identity, 'GetSession', {user_id:current.claims.sub}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Get('catalog') async catalog(@Req() req:any, @Query() query:any) { const current = session(req); try { return await unary(clients.catalog, 'ListRecordings', {query:query.q || '', school:query.school || '', course:query.course || '', semester:query.semester || ''}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Get('catalog/:id') async detail(@Req() req:any, @Param('id') id:string) { const current = session(req); try { return await unary(clients.catalog, 'GetRecording', {id}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Put('catalog/:id/rating') async vote(@Req() req:any, @Param('id') recording_id:string, @Body() body:any) { const current = session(req); try { return await unary(clients.catalog, 'Vote', {user_id:current.claims.sub, recording_id, vote:!!body.vote}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Post('playback/:id') async playback(@Req() req:any, @Param('id') recording_id:string) { const current = session(req); try { const reply = await unary(clients.playback, 'GetPlayback', {user_id:current.claims.sub, recording_id}, current.token); unary(clients.analytics, 'RecordView', {user_id:current.claims.sub, recording_id}, current.token).catch(() => undefined); return reply; } catch (error) { return grpcHttpError(error); } }
  @Put('playback/:id/checkpoint') async checkpoint(@Req() req:any, @Param('id') recording_id:string, @Body() body:any) { const current = session(req); try { return await unary(clients.playback, 'SaveCheckpoint', {user_id:current.claims.sub, recording_id, seconds:Number(body.seconds), event_type:body.event_type || 'checkpoint'}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Get('history') async history(@Req() req:any) { const current = session(req); try { return await unary(clients.playback, 'GetHistory', {user_id:current.claims.sub}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Get('playback/:id/stream') stream(@Req() req:any, @Res() res:any, @Param('id') recording_id:string) {
    const current = session(req);
    const metadata = new (require('@grpc/grpc-js').Metadata)();
    metadata.set('authorization', `Bearer ${current.token}`);
    const chunks:Buffer[] = [];
    const call = clients.playback.StreamVideo({user_id:current.claims.sub, recording_id}, metadata, {deadline:grpcDeadline()});
    call.on('data', (chunk:any) => chunks.push(Buffer.from(chunk.data)));
    call.on('error', (error:any) => { if (!res.headersSent) { const statuses:any = {16:401,7:403,5:404,4:504,14:503}; res.status(statuses[error?.code] || 502).end(); } });
    call.on('end', () => {
      const video = Buffer.concat(chunks);
      const total = video.length;
      const requestedRange = String(req.headers.range || '');
      const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
      if (match) {
        const start = match[1] === '' ? 0 : Number(match[1]);
        const end = match[2] === '' ? total - 1 : Math.min(Number(match[2]), total - 1);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= total) return res.status(416).set('Content-Range', `bytes */${total}`).end();
        return res.status(206).set({'Content-Type':'video/mp4', 'Accept-Ranges':'bytes', 'Content-Length':end - start + 1, 'Content-Range':`bytes ${start}-${end}/${total}`}).end(video.subarray(start, end + 1));
      }
      return res.status(200).set({'Content-Type':'video/mp4', 'Accept-Ranges':'bytes', 'Content-Length':total}).end(video);
    });
  }
  @Get('admin/analytics/most-viewed') async analytics(@Req() req:any, @Query('week_start') week_start:string) { const current = admin(req); try { return await unary(clients.analytics, 'MostViewed', {week_start:week_start || ''}, current.token); } catch (error) { return grpcHttpError(error); } }
  @Put('admin/users/:id/roles') async role(@Req() req:any, @Param('id') user_id:string, @Body() body:any) { const current = admin(req); try { return await unary(clients.identity, 'ChangeRole', {user_id, role:body.role, assign:!!body.assign, actor_id:current.claims.sub}, current.token); } catch (error) { return grpcHttpError(error); } }
}

@Module({controllers:[Api]}) class AppModule {}
async function bootstrap() { const tlsRoot = process.env.TLS_DIR || join(process.cwd(), 'tls'); const cert = join(tlsRoot, 'localhost.crt'); const key = join(tlsRoot, 'localhost.key'); if (!existsSync(cert) || !existsSync(key)) throw new Error('Falta certificado local TLS'); const app = await NestFactory.create(AppModule, {httpsOptions:{cert:readFileSync(cert), key:readFileSync(key)}} as any); app.use(cookieParser()); app.enableCors({origin:'https://localhost:3000', credentials:true}); await app.listen(Number(process.env.GATEWAY_PORT || 443), '0.0.0.0'); }
bootstrap();
