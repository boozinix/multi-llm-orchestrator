import { Benefit } from '../types';

// Calculate total value extracted this year
export const calculateYearlyValue = (benefits: Benefit[]): number => {
  const currentYear = new Date().getFullYear();
  return benefits
    .filter(b => {
      const benefitYear = new Date(b.expiresAt).getFullYear();
      return benefitYear === currentYear && b.isUsed;
    })
    .reduce((sum, b) => sum + b.value, 0);
};

// Calculate days until a benefit expires
export const getDaysUntilExpiry = (expiresAt: string): number => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Check if a benefit is urgent (expires within 7 days)
export const isUrgentBenefit = (expiresAt: string): boolean => {
  return getDaysUntilExpiry(expiresAt) <= 7;
};

// Format currency value
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Get greeting based on time of day
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};
