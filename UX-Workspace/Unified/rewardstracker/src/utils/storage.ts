import { CreditCard, Benefit, UserSettings } from '../types';

const STORAGE_KEYS = {
  CARDS: 'rewards_tracker_cards',
  BENEFITS: 'rewards_tracker_benefits',
  SETTINGS: 'rewards_tracker_settings',
};

// Cards
export const getCards = (): CreditCard[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CARDS);
  return data ? JSON.parse(data) : [];
};

export const saveCard = (card: CreditCard): void => {
  const cards = getCards();
  cards.push(card);
  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
};

export const deleteCard = (cardId: string): void => {
  const cards = getCards().filter(c => c.id !== cardId);
  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
};

// Benefits
export const getBenefits = (): Benefit[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BENEFITS);
  return data ? JSON.parse(data) : [];
};

export const saveBenefit = (benefit: Benefit): void => {
  const benefits = getBenefits();
  benefits.push(benefit);
  localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(benefits));
};

export const updateBenefit = (benefitId: string, updates: Partial<Benefit>): void => {
  const benefits = getBenefits().map(b => 
    b.id === benefitId ? { ...b, ...updates } : b
  );
  localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(benefits));
};

export const deleteBenefit = (benefitId: string): void => {
  const benefits = getBenefits().filter(b => b.id !== benefitId);
  localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(benefits));
};

// Settings
export const getSettings = (): UserSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? JSON.parse(data) : {
    pushNotifications: true,
    emailReminders: false,
  };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// Initialize with mock data if empty
export const initializeMockData = (): void => {
  if (getCards().length === 0) {
    const mockCards: CreditCard[] = [
      {
        id: '1',
        name: 'Chase Sapphire Reserve',
        last4: '4532',
        appliedDate: '2024-01-15',
        issuer: 'Chase',
      },
      {
        id: '2',
        name: 'American Express Gold',
        last4: '8901',
        appliedDate: '2023-06-20',
        issuer: 'Amex',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(mockCards));

    const mockBenefits: Benefit[] = [
      {
        id: '1',
        cardId: '1',
        cardName: 'Chase Sapphire Reserve',
        title: '$300 Travel Credit',
        value: 300,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'annual',
        isUsed: false,
      },
      {
        id: '2',
        cardId: '1',
        cardName: 'Chase Sapphire Reserve',
        title: 'Priority Pass Lounge Access',
        value: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'annual',
        isUsed: false,
      },
      {
        id: '3',
        cardId: '2',
        cardName: 'American Express Gold',
        title: '$10 Uber Cash',
        value: 10,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'monthly',
        isUsed: false,
      },
      {
        id: '4',
        cardId: '2',
        cardName: 'American Express Gold',
        title: '$10 Grubhub Credit',
        value: 10,
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'monthly',
        isUsed: false,
      },
    ];
    localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(mockBenefits));
  }
};
