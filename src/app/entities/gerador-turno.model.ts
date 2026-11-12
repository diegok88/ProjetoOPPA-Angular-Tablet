import { TurnoType } from './usuario.model';

export interface GeradorTurnoModel {
  turno: TurnoType;
  inicio: string;
  fim: string;
  timezone: string;
  consultadoEm: string;
}
