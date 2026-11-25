import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

import { DialogoSolucao } from '../dialogo-solucao';
import { TipoOcorrencia } from '../../fluxo-ocorrencia/anexos/ocorrencia.model';
import {
  DialogoSolucaoData,
  ResultadoDialogoSolucao,
  RetornoDialogoSolucao,
  SolucaoOcorrencia,
} from './dialogo-solucao.model';

@Injectable({ providedIn: 'root' })
export class DialogSolucaoService {
  private dialog = inject(Dialog);

  /** Última seleção completa (solução + tipo), disponível após finalização */
  public readonly solucaoSelecionada = signal<SolucaoOcorrencia | null>(null);

  abrir(config: DialogoSolucaoData): Observable<ResultadoDialogoSolucao> {
    this.solucaoSelecionada.set(null);

    const dialogRef = this.dialog.open<RetornoDialogoSolucao, DialogoSolucaoData>(DialogoSolucao, {
      data: config,
      disableClose: true,
    });

    return (dialogRef.closed as Observable<RetornoDialogoSolucao | undefined>).pipe(
      map((r): ResultadoDialogoSolucao => {
        if (r && typeof r === 'object' && r.resultado === 'finalizado') {
          this.solucaoSelecionada.set({
            solucaoId: r.solucaoId,
            tipoOcorrencia: r.tipoOcorrencia ?? TipoOcorrencia.OPERACIONAL.valor,
          });
          return 'finalizado';
        }
        return (r as ResultadoDialogoSolucao) ?? 'cancelado';
      }),
    );
  }
}
