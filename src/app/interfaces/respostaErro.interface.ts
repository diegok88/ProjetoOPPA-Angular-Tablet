export interface RespostaErro {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path?: string;
  details?: Record<string, any> | null;
}
