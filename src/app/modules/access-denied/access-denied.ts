import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.scss',
})
export class AccessDenied {
  private readonly router = inject(Router);

  protected voltarLogin(): void {
    this.router.navigate(['/login-user'], { replaceUrl: true });
  }
}
