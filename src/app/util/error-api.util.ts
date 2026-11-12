export function extrairMensagens(erro: unknown, fallback: string): string[] {
  if (Array.isArray(erro)) {
    const msgs = erro.filter((m): m is string => typeof m === 'string');
    return msgs.length > 0 ? msgs : [fallback];
  }

  const candidato = erro as { error?: unknown; message?: unknown };

  if (candidato?.error != null) {
    const corpo = candidato.error;

    if (typeof corpo === 'string') return [corpo];

    if (Array.isArray(corpo)) {
      const msgs = corpo.filter((m): m is string => typeof m === 'string');
      if (msgs.length > 0) return msgs;
    }

    if (typeof corpo === 'object') {
      const obj = corpo as { message?: unknown; msg?: unknown; error?: unknown };
      const possible = obj.message ?? obj.msg ?? obj.error;
      if (typeof possible === 'string') return [possible];
      if (Array.isArray(possible)) {
        const msgs = possible.filter((m): m is string => typeof m === 'string');
        if (msgs.length > 0) return msgs;
      }
    }
  }

  if (typeof candidato?.message === 'string') return [candidato.message];

  if (erro instanceof Error && erro.message) return [erro.message];

  return [fallback];
}
