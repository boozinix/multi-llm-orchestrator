import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { CreditCard as CardIcon, Clock, CheckCircle2, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { getBenefits, getCards, updateBenefit } from '../utils/storage';
import { Benefit, CreditCard } from '../types';
import { toast } from 'sonner';
import { 
  calculateYearlyValue, 
  getDaysUntilExpiry, 
  isUrgentBenefit,
  formatCurrency,
  getGreeting
} from '../utils/calculations';

export function Dashboard() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBenefits(getBenefits());
    setCards(getCards());
  };

  const getUpcomingBenefits = () => {
    const now = new Date();
    return benefits
      .filter(b => {
        if (b.isUsed) return false;
        if (b.snoozedUntil && new Date(b.snoozedUntil) > now) return false;
        return new Date(b.expiresAt) > now;
      })
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  };

  const handleMarkUsed = (benefitId: string, isUsed: boolean) => {
    updateBenefit(benefitId, { isUsed });
    loadData();
    toast.success(isUsed ? 'Benefit marked as used' : 'Benefit marked as unused');
  };

  const handleSnooze = (benefitId: string) => {
    const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    updateBenefit(benefitId, { snoozedUntil });
    loadData();
    toast.success('Benefit snoozed for 24 hours');
  };

  const handleAction = (benefit: Benefit) => {
    toast.info(`Action for: ${benefit.title}`);
  };

  const upcomingBenefits = getUpcomingBenefits();
  const totalValue = calculateYearlyValue(benefits);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Greeting & Summary */}
      <section className="space-y-2">
        <h2 className="text-2xl text-gray-900">
          {getGreeting()}
        </h2>
        <div className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white p-6 rounded-xl shadow-lg">
          <p className="text-sky-100 text-sm mb-2">Value extracted this year</p>
          <p className="text-4xl font-semibold">{formatCurrency(totalValue)}</p>
        </div>
      </section>

      {/* Upcoming Expiring Benefits */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-gray-900">Upcoming Expiring Benefits</h3>
          <Bell className="size-5 text-sky-500" />
        </div>
        
        {upcomingBenefits.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-gray-500 border-2 border-dashed border-gray-300">
            <p>No upcoming benefits</p>
            <Link to="/add-card" className="text-sky-600 hover:text-sky-700 underline font-medium mt-2 inline-block">
              Add a card to get started
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBenefits.map((benefit) => {
              const days = getDaysUntilExpiry(benefit.expiresAt);
              const isUrgent = isUrgentBenefit(benefit.expiresAt);
              
              return (
                <div
                  key={benefit.id}
                  className={`border rounded-xl p-4 space-y-3 transition-all bg-white ${
                    isUrgent 
                      ? 'border-orange-300 shadow-md ring-2 ring-orange-100' 
                      : 'border-gray-200 hover:border-sky-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-gray-500">{benefit.cardName}</p>
                      <p className="text-gray-900 font-medium">
                        {benefit.value > 0 ? `${formatCurrency(benefit.value)} ` : ''}{benefit.title}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className={`size-4 ${isUrgent ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className={isUrgent ? 'text-orange-700 font-medium' : 'text-gray-500'}>
                          Expires in {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(benefit)}
                      className="border-sky-600 text-sky-600 hover:bg-sky-50"
                    >
                      Action
                    </Button>
                    
                    <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 rounded-md px-3 py-1.5">
                      <Checkbox
                        id={`used-${benefit.id}`}
                        checked={benefit.isUsed}
                        onCheckedChange={(checked) => handleMarkUsed(benefit.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`used-${benefit.id}`}
                        className="text-sm cursor-pointer text-emerald-700"
                      >
                        Mark Used
                      </label>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSnooze(benefit.id)}
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      Snooze 24h
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Wallet */}
      <section className="space-y-4">
        <h3 className="text-lg text-gray-900">My Wallet</h3>
        
        {cards.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-gray-500 border-2 border-dashed border-gray-300">
            <p>No cards added yet</p>
            <Link to="/add-card" className="text-sky-600 hover:text-sky-700 underline font-medium mt-2 inline-block">
              Add your first card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card, index) => {
              // Create different gradient colors for each card
              const gradients = [
                'from-sky-500 to-blue-600',
                'from-cyan-500 to-teal-600',
                'from-blue-600 to-indigo-600',
                'from-teal-500 to-emerald-600',
                'from-gray-700 to-gray-900',
                'from-slate-600 to-slate-800',
              ];
              const gradient = gradients[index % gradients.length];
              
              return (
                <div
                  key={card.id}
                  className={`bg-gradient-to-br ${gradient} text-white p-6 rounded-xl space-y-4 shadow-md hover:shadow-lg transition-shadow`}
                >
                  <CardIcon className="size-8 opacity-80" />
                  <div className="space-y-1">
                    <p className="text-sm opacity-80">{card.issuer || 'Card'}</p>
                    <p className="text-lg font-medium">{card.name}</p>
                    <p className="text-sm opacity-80">•••• {card.last4}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}