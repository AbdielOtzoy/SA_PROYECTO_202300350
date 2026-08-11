import { status as GrpcStatus } from '@grpc/grpc-js';
import { grpcError } from '../common/grpc/grpc-errors';
import type { CsvRow } from './dto/catalog.dto';

const headerKey = (value: string): string => value.replace(/^\uFEFF/, '').trim();

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }

  if (quoted) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'CSV inválido: comillas sin cerrar');
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }
  return rows;
}

export function parseCsv(content: Buffer | Uint8Array | string, requiredHeaders: string[]): CsvRow[] {
  const text = Buffer.from(content).toString('utf8');
  if (!text.trim()) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El archivo CSV está vacío');
  const rows = parseCsvText(text);
  if (!rows.length) throw grpcError(GrpcStatus.INVALID_ARGUMENT, 'El archivo CSV no contiene filas');

  const headers = rows[0].map(headerKey);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw grpcError(GrpcStatus.INVALID_ARGUMENT, `Faltan columnas obligatorias: ${missing.join(', ')}`);
  }

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length > headers.length) {
      throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${rowIndex + 2} tiene columnas adicionales`);
    }
    return headers.reduce<CsvRow>((result, header, index) => {
      result[header] = (values[index] || '').trim();
      return result;
    }, {});
  });
}

export function csvRows(content: Buffer | Uint8Array | string, requiredHeaders: string[]): CsvRow[] {
  return parseCsv(content, requiredHeaders);
}

export function required(value: unknown, field: string, row: number): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} requiere ${field}`);
  return normalized;
}

export function integer(value: unknown, field: string, row: number): number {
  const parsed = Number(String(value || '').trim());
  if (!Number.isInteger(parsed)) throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} tiene ${field} inválido`);
  return parsed;
}

export function booleanValue(value: unknown, field: string, row: number): boolean {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  throw grpcError(GrpcStatus.INVALID_ARGUMENT, `La fila ${row} tiene ${field} inválido`);
}
