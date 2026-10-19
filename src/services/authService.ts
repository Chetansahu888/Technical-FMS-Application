import { User } from '../types';
import { masterDataService } from './masterDataService';

const AUTH_USER_KEY = 'tech_fms_current_user';

export const authService = {
  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    // Default logged in user for demo convenience: Admin Suresh Verma
    const defaultUser = masterDataService.getUsers().find(u => u.role === 'admin') || masterDataService.getUsers()[0];
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  },

  setCurrentUser(user: User): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  login(email: string, _password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const users = masterDataService.getUsers();
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (found) {
          if (!found.active) {
            resolve({ success: false, error: 'This user account is inactive. Please contact system administrator.' });
            return;
          }
          this.setCurrentUser(found);
          resolve({ success: true, user: found });
        } else {
          resolve({ success: false, error: 'Invalid email address or user not registered in Technical Help FMS.' });
        }
      }, 400);
    });
  },

  loginAsDemo(userId: string): User | undefined {
    const users = masterDataService.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      this.setCurrentUser(user);
    }
    return user;
  },

  logout(): void {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};
