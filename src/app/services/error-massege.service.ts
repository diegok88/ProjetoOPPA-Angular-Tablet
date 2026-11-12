import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ErrorMessageService {
  private readonly errorDictionary: Record<string, string> = {
    USER_NOT_FOUND: 'Usuário não encontrado.',
    INVALID_CREDENTIALS: 'Credenciais inválidas.',
    EMAIL_ALREADY_IN_USE: 'Este email já está cadastrado.',
    CONNECTION_FAILED: 'Falha na conexão com o servidor.',
    TIMEOUT: 'Tempo limite excedido.',
  };
  getUserMessage(code: string, defaultMsg: string): string {
    return this.errorDictionary[code] || defaultMsg;
  }
  getGenericMessage(): string {
    return 'Ocorreu um erro inesperado.';
  }
}
