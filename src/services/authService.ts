import { User } from '../types';
import { masterDataService } from './masterDataService';

const AUTH_USER_KEY = 'tech_fms_current_user';

export const authService = {
  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        if (parsed.name.toLowerCase() === 'suresh verma') {
          const adminUser = masterDataService.getUsers().find(u => u.name.toLowerCase() === 'admin') || masterDataService.getUsers()[0];
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(adminUser));
          return adminUser;
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    // Default logged in user: Admin
    const defaultUser = masterDataService.getUsers().find(u => u.name.toLowerCase() === 'admin') || masterDataService.getUsers().find(u => u.role === 'admin') || masterDataService.getUsers()[0];
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  },

  setCurrentUser(user: User): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  login(identifier: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const users = masterDataService.getUsers();
        const cleanId = identifier.trim().toLowerCase();
        const found = users.find(
          u => u.name.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)
        );

        if (found) {
          if (!found.active) {
            resolve({ success: false, error: 'This user account is inactive. Please contact system administrator.' });
            return;
          }
          if (password && found.password && found.password !== password.trim()) {
            resolve({ success: false, error: 'Incorrect password entered.' });
            return;
          }
          this.setCurrentUser(found);
          resolve({ success: true, user: found });
        } else {
          resolve({ success: false, error: 'User not found. Please enter your valid username.' });
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
