import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notifications.asObservable();

  constructor() {}

  showSuccess(title: string, message: string, duration: number = 3000): void {
    this.addNotification('success', title, message, duration);
  }

  showError(title: string, message: string, duration: number = 5000): void {
    this.addNotification('error', title, message, duration);
  }

  showWarning(title: string, message: string, duration: number = 4000): void {
    this.addNotification('warning', title, message, duration);
  }

  showInfo(title: string, message: string, duration: number = 3000): void {
    this.addNotification('info', title, message, duration);
  }

  private addNotification(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration: number): void {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      duration,
      timestamp: new Date()
    };

    const currentNotifications = this.notifications.value;
    this.notifications.next([...currentNotifications, notification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notifications.value;
    this.notifications.next(currentNotifications.filter(n => n.id !== id));
  }

  clearAll(): void {
    this.notifications.next([]);
  }
}
