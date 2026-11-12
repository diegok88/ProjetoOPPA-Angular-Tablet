import { environment } from './environment.const';

export const RequestHttp = {
  auth: `${environment.apiUrl}/auth`,
  gerador_turno: `${environment.apiUrl}/gerador-turno`,
  perfil: `${environment.apiUrl}/perfil`,
  gestor: `${environment.apiUrl}/gestor`,
  alocacao_operacional: `${environment.apiUrl}/alocacao`,
  usuario: `${environment.apiUrl}/usuario`,
  controle_jornada: `${environment.apiUrl}/controle-jornada`,
  ocorrencia: `${environment.apiUrl}/ocorrencia`,
  falhas: `${environment.apiUrl}/falhas`,
  fluxo_ocorrencia: `${environment.apiUrl}/fluxo-ocorrencia`,
};

/*
  dispensas: 'http://localhost:3000/dispensas',
  penalidades: 'http://localhost:3000/penalidades',
  perfil: 'http://localhost:3000/perfil',
  empresa: 'http://localhost:3000/empresa',
  setor: 'http://localhost:3000/setores',
  falhas: 'http://localhost:3000/falhas',
  solucoes: 'http://localhost:3000/solucoes',
  ativos: 'http://localhost:3000/ativo',
  tag_ativo: 'http://localhost:3000/tag-ativo',
  auditoria: 'http://localhost:3000/auditoria',

*/
