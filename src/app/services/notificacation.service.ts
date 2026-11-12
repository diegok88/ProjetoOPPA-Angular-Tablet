import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Notification } from '../interfaces/notification.interface';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  public notification$ = this.notificationSubject.asObservable();

  public showSuccess(message: string): void {
    this.notificationSubject.next({ message, type: 'success' });
  }
  public showError(message: string): void {
    this.notificationSubject.next({ message, type: 'error' });
  }
  public showWarning(message: string): void {
    this.notificationSubject.next({ message, type: 'warning' });
  }
  public(notification: Notification): void {
    this.notificationSubject.next(notification);
  }
}
