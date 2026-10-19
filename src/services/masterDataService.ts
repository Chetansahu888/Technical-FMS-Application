import { MasterSettings, User, TicketCategory } from '../types';
import { INITIAL_USERS, INITIAL_MASTER_SETTINGS } from './seedData';

const SETTINGS_KEY = 'tech_fms_master_settings';
const USERS_KEY = 'tech_fms_users';

class MasterDataService {
  /**
   * Get all system users
   */
  getUsers(): User[] {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }

  /**
   * Save users
   */
  saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /**
   * Get IT persons who are active
   */
  getActiveITPersons(): User[] {
    return this.getUsers().filter(u => u.role === 'it_person' && u.active);
  }

  /**
   * Get master settings
   */
  getSettings(): MasterSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_MASTER_SETTINGS,
          ...parsed,
          googleDriveFolderId: parsed.googleDriveFolderId || INITIAL_MASTER_SETTINGS.googleDriveFolderId,
          googleAppsScriptUrl: parsed.googleAppsScriptUrl || INITIAL_MASTER_SETTINGS.googleAppsScriptUrl || '',
        };
      }
    } catch {
      // fallback
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_MASTER_SETTINGS));
    return INITIAL_MASTER_SETTINGS;
  }

  /**
   * Save master settings
   */
  saveSettings(settings: MasterSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * Update Google Drive & Apps Script settings
   */
  updateDriveSettings(folderId: string, scriptUrl: string): MasterSettings {
    const settings = this.getSettings();
    settings.googleDriveFolderId = folderId.trim();
    settings.googleAppsScriptUrl = scriptUrl.trim();
    this.saveSettings(settings);
    return settings;
  }

  /**
   * Get list of companies
   */
  getCompanies(): string[] {
    return this.getSettings().companies;
  }

  /**
   * Add a new company
   */
  addCompany(name: string): string[] {
    const settings = this.getSettings();
    const trimmed = name.trim();
    if (trimmed && !settings.companies.includes(trimmed)) {
      settings.companies.push(trimmed);
      this.saveSettings(settings);
    }
    return settings.companies;
  }

  /**
   * Remove a company
   */
  removeCompany(name: string): string[] {
    const settings = this.getSettings();
    settings.companies = settings.companies.filter(c => c !== name);
    this.saveSettings(settings);
    return settings.companies;
  }

  /**
   * Get list of categories
   */
  getCategories(): TicketCategory[] {
    return this.getSettings().categories;
  }

  /**
   * Add category
   */
  addCategory(name: string): TicketCategory[] {
    const settings = this.getSettings();
    const trimmed = name.trim() as TicketCategory;
    if (trimmed && !settings.categories.includes(trimmed)) {
      settings.categories.push(trimmed);
      this.saveSettings(settings);
    }
    return settings.categories;
  }

  /**
   * Update working days and SLA settings
   */
  updateSLA(workingDays: number[], slaWorkingDays: number): void {
    const settings = this.getSettings();
    settings.workingDays = workingDays;
    settings.slaWorkingDays = slaWorkingDays;
    this.saveSettings(settings);
  }

  /**
   * Add a new user (Admin, IT Specialist, or Employee)
   */
  addUser(userData: {
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'it_person' | 'employee';
    company: string;
  }): User {
    const users = this.getUsers();
    const newUser: User = {
      id: `usr_${userData.role}_${Date.now()}`,
      name: userData.name.trim(),
      email: userData.email.trim(),
      password: userData.password?.trim() || 'password123',
      role: userData.role,
      company: userData.company,
      active: true,
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  /**
   * Update an existing user
   */
  updateUser(id: string, updates: Partial<User>): User[] {
    const users = this.getUsers().map(u => {
      if (u.id === id) {
        return { ...u, ...updates };
      }
      return u;
    });
    this.saveUsers(users);
    return users;
  }

  /**
   * Delete a user
   */
  deleteUser(id: string): User[] {
    const users = this.getUsers().filter(u => u.id !== id);
    this.saveUsers(users);
    return users;
  }

  /**
   * Toggle user active status
   */
  toggleUserActive(id: string): User[] {
    const users = this.getUsers().map(u => {
      if (u.id === id) {
        return { ...u, active: !u.active };
      }
      return u;
    });
    this.saveUsers(users);
    return users;
  }

  /**
   * Add a new IT person (legacy wrapper)
   */
  addITPerson(name: string, email: string): User {
    return this.addUser({
      name,
      email,
      role: 'it_person',
      company: 'PMMPL',
    });
  }

  /**
   * Toggle IT person active state (legacy wrapper)
   */
  toggleITPersonActive(id: string): User[] {
    return this.toggleUserActive(id);
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_MASTER_SETTINGS));
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
}

export const masterDataService = new MasterDataService();
