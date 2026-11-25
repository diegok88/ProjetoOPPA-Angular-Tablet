import { Routes } from '@angular/router';
import { Dashboard } from './modules/dashboard/dashboard';
import { Login } from './modules/login/login';
import { AccessDenied } from './modules/access-denied/access-denied';
import { ROLES_MAP } from './constants/role-map.const';
import { roleGuard } from './constants/role.guard';
import { HistoricoSolicitacoes } from './components/historico-solicitacoes/historico-solicitacoes';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [roleGuard],
    data: { roles: [ROLES_MAP.TER1] },
  },
  {
    path: 'historico-solicitacoes',
    component: HistoricoSolicitacoes,
    canActivate: [roleGuard],
    data: { roles: [ROLES_MAP.TER1] },
  },
  { path: 'access-denied', component: AccessDenied },
  { path: '**', redirectTo: 'login' },
];
