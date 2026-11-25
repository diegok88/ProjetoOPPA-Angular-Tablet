import { computed, inject, Injectable } from '@angular/core';
import { AlocacaoOperacionalService } from '../../../services/alocacao-operacional.service';
import { AuthService } from '../../../services/auth.service';

export interface EscopoOperador {
  operadorId: string;
  tagAtivoId: string;
}

@Injectable({ providedIn: 'root' })
export class EscopoOperacionalService {
  private readonly alocacaoService = inject(AlocacaoOperacionalService);
  private readonly auth = inject(AuthService);

  readonly alocacao = this.alocacaoService.buscarAlocacaoOperacional;

  readonly escopo = computed<EscopoOperador | null>(() => this.normalizar(this.alocacao()));

  /** Id do usuário logado no tablet. Serve de reserva quando a alocação não traz operador. */
  readonly sessaoId = computed(() => this.idSessao());

  /**
   * Operador usado em filtros e ações.
   * Preferência: operador da alocação. Reserva: usuário logado.
   * Nunca fica vazio se houver sessão, então a tela não trava esperando alocação.
   */
  readonly operadorId = computed(() => this.escopo()?.operadorId || this.sessaoId());

  readonly tagAtivoId = computed(() => this.escopo()?.tagAtivoId ?? '');

  /** Indica se o operador veio da alocação (true) ou só da sessão (false). */
  readonly operadorDaAlocacao = computed(() => !!this.escopo()?.operadorId);

  readonly pronto = computed(() => this.alocacao() !== null);
  readonly semOperador = computed(() => !this.operadorId());

  recarregar(query: string): void {
    this.alocacaoService
      .buscarAlocacao(query)
      .subscribe({ error: () => this.alocacaoService.limparBuscar() });
  }

  private normalizar(bruto: unknown): EscopoOperador | null {
    if (!bruto || typeof bruto !== 'object') return null;

    const a = bruto as Record<string, unknown>;
    const operador = this.obj(a['operador']);
    const alocacao = this.obj(a['alocacao']);
    const tagAtivo = this.obj(a['tagAtivo']);

    const operadorId = this.texto(
      a['operadorId'],
      operador?.['id'],
      operador?.['usuarioId'],
      operador?.['colaboradorId'],
      a['usuarioId'],
      a['colaboradorId'],
      a['pessoaId'],
      alocacao?.['operadorId'],
      alocacao?.['colaboradorId'],
      this.idProprio(a, alocacao, tagAtivo),
    );

    if (!operadorId) return null;

    const tagAtivoId = this.texto(
      a['tagAtivoId'],
      tagAtivo?.['id'],
      alocacao?.['tagAtivoId'],
      a['tagId'],
      a['ativoId'],
    );

    return { operadorId, tagAtivoId };
  }

  private idProprio(
    a: Record<string, unknown>,
    alocacao: Record<string, unknown> | undefined,
    tagAtivo: Record<string, unknown> | undefined,
  ): string {
    if (alocacao || tagAtivo) return '';
    const pareceOperador = !!(a['nome'] || a['cracha'] || a['matricula']);
    return pareceOperador ? String(a['id'] ?? '') : '';
  }

  private idSessao(): string {
    const perfil = this.auth.usuario() as unknown as Record<string, unknown> | null | undefined;
    if (!perfil) return '';

    return this.texto(
      perfil['id'],
      perfil['usuarioId'],
      perfil['colaboradorId'],
      perfil['operadorId'],
    );
  }

  private obj(valor: unknown): Record<string, unknown> | undefined {
    return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : undefined;
  }

  private texto(...valores: unknown[]): string {
    for (const valor of valores) {
      if (typeof valor === 'string' && valor.trim()) return valor.trim();
      if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
    }
    return '';
  }
}
