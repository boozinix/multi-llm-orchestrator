// Types for the Rewards Tracker app

export interface CreditCard {
  id: string;
  name: string;
  last4: string;
  appliedDate: string;
  issuer?: string;
}

export interface Benefit {
  id: string;
  cardId: string;
  cardName: string;
  title: string;
  value: number;
  expiresAt: string;
  frequency: 'monthly' | 'annual' | 'quarterly';
  isUsed: boolean;
  snoozedUntil?: string;
  reminderDaysBefore?: number; // New field for reminder days before expiry
}

export interface ScrapedCard {
  id: string;
  name: string;
  url: string;
  benefits: string[];
  frequency: 'monthly' | 'annual' | 'quarterly';
  lastScraped: string;
  reschedule: 'manual' | 'weekly' | 'monthly';
}

export interface UserSettings {
  pushNotifications: boolean;
  emailReminders: boolean;
}