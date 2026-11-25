import { HttpParams } from '@angular/common/http';
import { SolucoesQuery } from './solucoes.model';

export function buildSolucoesParams(query: SolucoesQuery): HttpParams {
  let params = new HttpParams();

  const pares: Record<string, string | number | boolean | undefined | null> = {
    codigo: query.codigo,
    falhaId: query.falhaId,
    direcionamentoId: query.direcionamentoId,
    desPerfil: query.desPerfil,
    descricao: query.descricao,
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
