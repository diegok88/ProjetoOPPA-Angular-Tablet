import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permitidos = (route.data['roles'] as string[] | undefined) ?? [];

  // Sem token, nem chama a API
  if (!auth.getToken()) return router.createUrlTree(['/login']);

  // obterPerfil() usa o cache quando existe e busca /auth/profile após reload
  return auth.obterPerfil().pipe(
    map((perfil) => {
      if (permitidos.length === 0 || permitidos.includes(perfil.desPerfil)) return true;
      return router.createUrlTree(['/access-denied']);
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
