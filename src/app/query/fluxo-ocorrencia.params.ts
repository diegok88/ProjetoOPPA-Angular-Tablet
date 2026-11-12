import { HttpParams } from '@angular/common/http';
import { OcorrenciaQuery } from '../entities/ocorrencia.model';
import { FluxoOcorrenciaQuery } from '../entities/fluxo-ocorrencia.model';

export function buildFluxoOcorrenciaParams(query: FluxoOcorrenciaQuery): HttpParams {
  let params = new HttpParams();

  const pares: Record<string, string | number | boolean | undefined | null> = {
    codigo: query.codigo,
    ocorrenciaId: query.ocorrenciaId,
    usuarioId: query.usuarioId,
    transferidoPerfilId: query.transferidoPerfilId,
    dataInicial: query.dataInicial,
    dataFinal: query.dataFinal,
    duracao: query.duracao,
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
