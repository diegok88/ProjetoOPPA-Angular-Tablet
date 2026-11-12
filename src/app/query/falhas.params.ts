import { HttpParams } from '@angular/common/http';
import { FalhasQuery } from '../entities/falhas.model';

export function buildFalhasParams(query: FalhasQuery): HttpParams {
  let params = new HttpParams();

  const pares: Record<string, string | number | boolean | undefined | null> = {
    codigo: query.codigo,
    descricao: query.descricao,
    ativoId: query.ativoId,
    direcionamentoId: query.direcionamentoId,
    status: query.status,
    consulta: query.consulta,
    desvios: query.desvios,
    page: query.page,
    size: query.size,
  };

  for (const [chave, valor] of Object.entries(pares)) {
    if (valor === undefined || valor === null || valor === '') continue;
    params = params.set(chave, String(valor));
  }

  return params;
}
