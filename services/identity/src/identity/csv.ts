import { status as GrpcStatus } from '@grpc/grpc-js';
import { grpcError } from '../common/grpc/grpc-errors';

function rows(text: string): string[][] {
  const output: string[][] = [];
  let current: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      current.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      current.push(field);
      field = '';
      if (current.some((value) => value.trim())) output.push(current);
      current = [];
    } else field += character;
  }
  if (quoted) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'CSV inválido: comillas sin cerrar');
  if (field || current.length) {
    current.push(field);
    if (current.some((value) => value.trim())) output.push(current);
  }
  return output;
}

export function csvRows(content: Buffer | Uint8Array | string, requiredHeaders: string[]): Record<string, string>[] {
  const parsed = rows(Buffer.from(content).toString('utf8'));
  if (!parsed.length) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El CSV está vacío');
  const headers = parsed[0].map((value) => value.replace(/^\uFEFF/, '').trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw grpcError(GrpcStatus.INVALID_ARGUMENT, `Faltan columnas: ${missing.join(', ')}`);
  return parsed.slice(1).map((values, index) => {
    if (values.length > headers.length)
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${index + 2} tiene columnas adicionales`);
    return headers.reduce<Record<string, string>>((result, header, position) => {
      result[header] = (values[position] || '').trim();
      return result;
    }, {});
  });
}

export function required(value: unknown, field: string, row: number): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} requiere ${field}`);
  return normalized;
}

export function uuidValue(value: unknown, field: string, row: number): string {
  const normalized = required(value, field, row);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} tiene ${field} inválido`);
  }
  return normalized;
}
