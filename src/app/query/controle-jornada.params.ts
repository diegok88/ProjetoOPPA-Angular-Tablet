import { HttpParams } from '@angular/common/http';
import { ControleJornadaQuery } from '../entities/controle-jornada.model';

export function buildControleJornadaParams(query: ControleJornadaQuery): HttpParams {
  let params = new HttpParams();

  const pares: Record<string, string | number | boolean | undefined | null> = {
    codigo: query.codigo,
    usuarioId: query.usuarioId,
    tagAtivoId: query.tagAtivoId,
    tipoJornada: query.tipoJornada,
    estadoJornada: query.estadoJornada,
    dataRegistro: query.dataRegistro,
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
