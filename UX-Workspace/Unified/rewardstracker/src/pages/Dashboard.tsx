import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function Dashboard() {
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
    <div className="min-h-screen pb-32 bg-surface text-on-surface">
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
            <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ4UJ4SoC1H0UnsST5VSa7SL9n1cWe55RGHvFvh4xqMjOIQas7DWS5V8BpC6ZuWF3vMUpoUumRksM-AwvKT1HQHs_uwMzpvkPqUsYfxbfvFwSk9vX52q3ocGYnCheiNweEKnIeD46n2pYUgL22D3B82sdQkIFrtPPAQARMbZ3Q8ITxdxOtmZ_eDW68MkcGeRy-s-xelJZyYaPKflxL7GUCb14YBE6y3rp4pgBMYGj_qAzcDa4aUJZ5u-se55Q1x9rDPwRo8CPDCcwl"/>
          </div>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">Rewards Tracker</h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95 duration-200">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>
      <main className="pt-24 px-6 max-w-7xl mx-auto space-y-10">
        <section className="relative overflow-hidden rounded-xl p-8 bg-gradient-to-br from-primary via-primary-dim to-tertiary-dim text-on-primary">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="font-label text-sm font-semibold uppercase tracking-widest opacity-80 mb-2">Total Rewards Value</p>
              <h2 className="font-headline text-6xl md:text-7xl font-extrabold tracking-tighter">{formatCurrency(totalValue)}</h2>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex items-center bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                  <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
                  +12.4% this month
                </span>
              </div>
            </div>
            <div className="flex -space-x-4">
              <div className="w-16 h-16 rounded-full border-4 border-primary-dim bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container">flight</span>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-primary-dim bg-tertiary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-tertiary-container">restaurant</span>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-primary-dim bg-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-fixed">shopping_bag</span>
              </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[10%] w-48 h-48 bg-tertiary/20 rounded-full blur-2xl"></div>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-headline text-2xl font-bold tracking-tight">My Wallet</h3>
              <button className="text-primary font-semibold text-sm hover:underline">Manage</button>
            </div>
            <div className="space-y-4">
              {cards.length === 0 ? (
                <div className="bg-white p-6 rounded-xl text-center text-gray-500 border-2 border-dashed border-gray-300">
                  <p>No cards added yet</p>
                  <Link to="/add-card" className="text-sky-600 hover:text-sky-700 underline font-medium mt-2 inline-block">
                    Add your first card
                  </Link>
                </div>
              ) : (
                cards.map((card, index) => {
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
                })
              )}
            </div>
          </div>
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-headline text-2xl font-bold tracking-tight">Expiring Benefits</h3>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                <p className="text-error font-bold text-sm">3 Ending Soon</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingBenefits.length === 0 ? (
                <div className="bg-white p-6 rounded-xl text-center text-gray-500 border-2 border-dashed border-gray-300">
                  <p>No upcoming benefits</p>
                  <Link to="/add-card" className="text-sky-600 hover:text-sky-700 underline font-medium mt-2 inline-block">
                    Add a card to get started
                  </Link>
                </div>
              ) : (
                upcomingBenefits.map((benefit) => {
                  const days = getDaysUntilExpiry(benefit.expiresAt);
                  const isUrgent = isUrgentBenefit(benefit.expiresAt);
                  return (
                    <div
                      key={benefit.id}
                      className={`bg-surface-container-lowest rounded-lg p-6 flex flex-col justify-between h-full group hover:shadow-[0_20px_40px_rgba(43,42,81,0.06)] transition-all ${
                        isUrgent ? 'border-l-8 border-error' : 'border-l-8 border-primary'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary-container/20 p-3 rounded-xl">
                          <span className="material-symbols-outlined text-primary">flight_takeoff</span>
                        </div>
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Travel</span>
                      </div>
                      <div>
                        <h4 className="font-headline text-xl font-bold mb-1">{benefit.title}</h4>
                        <p className="text-on-surface-variant text-sm mb-4">{benefit.description}</p>
                        <div className="flex items-center gap-2 mb-6">
                          <span className={`material-symbols-outlined text-sm ${isUrgent ? 'text-error' : 'text-gray-400'}`}>timer</span>
                          <p className={`text-xs font-bold ${isUrgent ? 'text-error' : 'text-gray-500'}`}>Expires in {days} {days === 1 ? 'day' : 'days'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(benefit)}
                          className="border-sky-600 text-sky-600 hover:bg-sky-50"
                        >
                          Action
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSnooze(benefit.id)}
                          className="text-gray-600 hover:bg-gray-100"
                        >
                          Snooze 24h
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
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-50 rounded-t-[3rem] shadow-[0_-4px_40px_rgba(43,42,81,0.06)]">
        <a className="flex flex-col items-center justify-center bg-[#f2efff] dark:bg-[#0846ed]/20 text-[#0846ed] dark:text-[#859aff] rounded-[2rem] px-5 py-2 active:scale-90 transition-transform duration-200" href="#">
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-semibold tracking-wide uppercase">Home</span>
        </a>
        <a className="flex flex-col items-center justify-center text-[#585781] dark:text-slate-400 px-5 py-2 hover:bg-[#f9f5ff] dark:hover:bg-slate-800 transition-colors active:scale-90 transition-transform duration-200" href="#">
          <span className="material-symbols-outlined mb-1">redeem</span>
          <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-semibold tracking-wide uppercase">Benefits</span>
        </a>
        <a className="flex flex-col items-center justify-center text-[#585781] dark:text-slate-400 px-5 py-2 hover:bg-[#f9f5ff] dark:hover:bg-slate-800 transition-colors active:scale-90 transition-transform duration-200" href="#">
          <span className="material-symbols-outlined mb-1">calendar_today</span>
          <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-semibold tracking-wide uppercase">Calendar</span>
        </a>
        <a className="flex flex-col items-center justify-center text-[#585781] dark:text-slate-400 px-5 py-2 hover:bg-[#f9f5ff] dark:hover:bg-slate-800 transition-colors active:scale-90 transition-transform duration-200" href="#">
          <span className="material-symbols-outlined mb-1">settings</span>
          <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-semibold tracking-wide uppercase">Settings</span>
        </a>
      </nav>
    </div>
  );
}