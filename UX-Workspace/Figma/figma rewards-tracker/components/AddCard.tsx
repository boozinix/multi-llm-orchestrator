import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, CreditCard as CardIcon, Calendar, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { saveCard, saveBenefit } from '../utils/storage';
import { CreditCard, Benefit } from '../types';
import { toast } from 'sonner';
import { CARD_DATABASE } from '../data/cardDatabase';
import { getBenefitsForCard, BenefitTemplate } from '../data/benefitsDatabase';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';

export function AddCard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'search' | 'benefits'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<typeof CARD_DATABASE[0] | null>(null);
  const [last4, setLast4] = useState('');
  const [appliedDate, setAppliedDate] = useState('');
  const [savedCardId, setSavedCardId] = useState('');
  
  // Benefits state
  const [benefitStates, setBenefitStates] = useState<Record<string, {
    enabled: boolean;
    reminderDaysBefore: number;
  }>>({});

  const filteredCards = searchQuery
    ? CARD_DATABASE.filter(card =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.issuer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSaveCard = () => {
    if (!selectedCard) {
      toast.error('Please select a card from the search results');
      return;
    }

    if (!appliedDate) {
      toast.error('Please enter the date you applied for this card');
      return;
    }

    const newCard: CreditCard = {
      id: Date.now().toString(),
      name: selectedCard.name,
      last4: last4 || '****',
      appliedDate,
      issuer: selectedCard.issuer,
    };

    saveCard(newCard);
    setSavedCardId(newCard.id);

    // Get benefits for this card
    const availableBenefits = getBenefitsForCard(selectedCard.name);
    
    // Initialize benefit states (all enabled by default with default reminder days)
    const initialStates: Record<string, { enabled: boolean; reminderDaysBefore: number }> = {};
    availableBenefits.forEach((benefit, index) => {
      const defaultDays = benefit.frequency === 'monthly' ? 3 : benefit.frequency === 'quarterly' ? 7 : 14;
      initialStates[index.toString()] = {
        enabled: true,
        reminderDaysBefore: defaultDays,
      };
    });
    setBenefitStates(initialStates);

    // Move to benefits step
    setStep('benefits');
  };

  const calculateExpirationDate = (benefit: BenefitTemplate): string => {
    const appliedDateObj = new Date(appliedDate);
    
    switch (benefit.frequency) {
      case 'monthly':
        // Next month from today
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
      
      case 'quarterly':
        // 3 months from applied date
        const quarterly = new Date(appliedDateObj);
        quarterly.setMonth(quarterly.getMonth() + 3);
        return quarterly.toISOString();
      
      case 'annual':
        // 1 year from applied date
        const annual = new Date(appliedDateObj);
        annual.setFullYear(annual.getFullYear() + 1);
        return annual.toISOString();
      
      default:
        return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const handleSaveBenefits = () => {
    const availableBenefits = getBenefitsForCard(selectedCard!.name);
    
    availableBenefits.forEach((benefit, index) => {
      const state = benefitStates[index.toString()];
      
      if (state?.enabled) {
        const expirationDate = calculateExpirationDate(benefit);

        const newBenefit: Benefit = {
          id: `${savedCardId}-${Date.now()}-${index}`,
          cardId: savedCardId,
          cardName: selectedCard!.name,
          title: benefit.title,
          value: benefit.value,
          expiresAt: expirationDate,
          frequency: benefit.frequency,
          isUsed: false,
          reminderDaysBefore: state.reminderDaysBefore,
        };

        saveBenefit(newBenefit);
      }
    });

    toast.success('Card and benefits added successfully!');
    navigate('/');
  };

  const toggleBenefit = (index: string) => {
    setBenefitStates(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        enabled: !prev[index]?.enabled,
      },
    }));
  };

  const setReminderDays = (index: string, days: string) => {
    const numDays = parseInt(days) || 0;
    setBenefitStates(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        reminderDaysBefore: numDays,
      },
    }));
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'monthly':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'quarterly':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'annual':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Benefits setup screen
  if (step === 'benefits' && selectedCard) {
    const availableBenefits = getBenefitsForCard(selectedCard.name);
    const enabledCount = Object.values(benefitStates).filter(s => s.enabled).length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl text-gray-900">
            Set Up Benefits
          </h2>
          <p className="text-gray-500">
            Enable benefits and set reminder dates for {selectedCard.name}
          </p>
        </div>

        {availableBenefits.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center space-y-4 border border-gray-200">
            <p className="text-gray-500">
              No benefits found for this card in our database yet.
            </p>
            <Button
              onClick={() => {
                toast.success('Card added successfully!');
                navigate('/');
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              Continue to Dashboard
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <p className="text-sm text-sky-900">
                <strong>{enabledCount} of {availableBenefits.length}</strong> benefits enabled. 
                You can change these later from your dashboard.
              </p>
            </div>

            <div className="space-y-3">
              {availableBenefits.map((benefit, index) => {
                const state = benefitStates[index.toString()];
                const isEnabled = state?.enabled ?? true;
                const reminderDays = state?.reminderDaysBefore ?? (benefit.frequency === 'monthly' ? 3 : benefit.frequency === 'quarterly' ? 7 : 14);
                const expirationDate = calculateExpirationDate(benefit);

                return (
                  <div
                    key={index}
                    className={`border rounded-xl p-4 transition-all bg-white ${
                      isEnabled 
                        ? 'border-sky-200 shadow-sm' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleBenefit(index.toString())}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                {benefit.title}
                              </p>
                              {benefit.description && (
                                <p className={`text-sm mt-1 ${isEnabled ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {benefit.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {benefit.value > 0 && (
                                <Badge className="shrink-0 bg-emerald-500 text-white border-0">
                                  ${benefit.value}
                                </Badge>
                              )}
                              <Badge className={`shrink-0 capitalize border ${getFrequencyColor(benefit.frequency)}`}>
                                {benefit.frequency}
                              </Badge>
                            </div>
                          </div>
                          
                          {isEnabled && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                              <Calendar className="size-3.5 text-blue-600" />
                              <span>Deadline: {new Date(expirationDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}</span>
                            </div>
                          )}
                        </div>

                        {isEnabled && (
                          <div className="space-y-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <Label htmlFor={`reminder-${index}`} className="text-sm text-gray-900 flex items-center gap-2">
                              <Bell className="size-4 text-amber-600" />
                              Remind me how many days before?
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                id={`reminder-${index}`}
                                type="number"
                                min="0"
                                max="365"
                                value={reminderDays}
                                onChange={(e) => setReminderDays(index.toString(), e.target.value)}
                                className="text-sm w-24 bg-white"
                              />
                              <span className="text-sm text-gray-600">days before deadline</span>
                            </div>
                            <p className="text-xs text-amber-700 flex items-center gap-1.5">
                              <AlertCircle className="size-3" />
                              You'll be reminded on {new Date(new Date(expirationDate).getTime() - reminderDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setStep('search')}
                variant="outline"
                className="flex-1 border-gray-300"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveBenefits}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white shadow-lg"
              >
                <CheckCircle2 className="size-4 mr-2" />
                Save & Continue
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Original search and card details screen
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl text-gray-900">Add a Card</h2>
        <p className="text-gray-500">Search for your credit card and enter details</p>
      </div>

      {/* Search Bar */}
      <div className="space-y-2">
        <Label htmlFor="search">Search for a card</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-sky-400" />
          <Input
            id="search"
            type="text"
            placeholder="e.g., Chase Sapphire, Amex Gold..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300 focus:border-sky-500 bg-white"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="border border-sky-200 rounded-lg overflow-hidden divide-y divide-gray-200 max-h-64 overflow-y-auto shadow-lg bg-white">
            {filteredCards.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No cards found
              </div>
            ) : (
              filteredCards.map((card, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedCard(card);
                    setSearchQuery(card.name);
                  }}
                  className="w-full p-4 text-left hover:bg-sky-50 transition-colors flex items-center gap-3"
                >
                  <CardIcon className="size-5 text-sky-500" />
                  <div>
                    <p className="text-gray-900">{card.name}</p>
                    <p className="text-sm text-gray-500">{card.issuer}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Card Details */}
      {selectedCard && (
        <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <CardIcon className="size-6 text-sky-600" />
            </div>
            <div>
              <p className="text-gray-900 font-medium">{selectedCard.name}</p>
              <p className="text-sm text-gray-500">{selectedCard.issuer}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="last4">Last 4 Digits (Optional)</Label>
              <Input
                id="last4"
                type="text"
                placeholder="1234"
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
                className="bg-white border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appliedDate">
                When did you apply for this card? <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="appliedDate"
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-white border-gray-300"
              />
              <p className="text-xs text-gray-500">
                This helps us calculate account anniversary benefit resets
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSaveCard}
        disabled={!selectedCard || !appliedDate}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg"
      >
        Continue to Benefits Setup
      </Button>
    </div>
  );
}