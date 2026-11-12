import { HttpParams } from '@angular/common/http';
import { OcorrenciaQuery } from '../entities/ocorrencia.model';

export function buildOcorrenciaParams(query: OcorrenciaQuery): HttpParams {
  let params = new HttpParams();

  const pares: Record<string, string | number | boolean | undefined | null> = {
    codigo: query.codigo,
    estadoAtivoId: query.estadoAtivoId,
    tagAtivoId: query.tagAtivoId,
    falhaId: query.falhaId,
    solucaoId: query.solucaoId,
    tipoOcorrencia: query.tipoOcorrencia,
    condicaoOcorrencia: query.condicaoOcorrencia,
    solucionadoId: query.solucionadoId,
    dataInicial: query.dataInicial,
    dataFalhaRegistrado: query.dataFalhaRegistrado,
    dataFinal: query.dataFinal,
    statusFalha: query.statusFalha,
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
