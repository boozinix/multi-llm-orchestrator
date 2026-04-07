import { useState } from 'react';
import { Database, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrapedCard } from '../types';
import { toast } from 'sonner';

export function AdminScraper() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedCards, setScrapedCards] = useState<ScrapedCard[]>([
    {
      id: '1',
      name: 'Chase Sapphire Reserve',
      url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
      benefits: ['$300 Annual Travel Credit', 'Priority Pass', 'DoorDash DashPass'],
      frequency: 'annual',
      lastScraped: new Date().toISOString(),
      reschedule: 'monthly',
    },
    {
      id: '2',
      name: 'American Express Gold',
      url: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
      benefits: ['$10 Monthly Uber Cash', '$10 Monthly Grubhub Credit', '$120 Dining Credit'],
      frequency: 'monthly',
      lastScraped: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reschedule: 'weekly',
    },
  ]);

  const handleRunExtractor = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    setIsLoading(true);
    
    // Mock LLM extraction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newCard: ScrapedCard = {
      id: Date.now().toString(),
      name: 'Extracted Card Name',
      url,
      benefits: ['Benefit 1', 'Benefit 2', 'Benefit 3'],
      frequency: 'monthly',
      lastScraped: new Date().toISOString(),
      reschedule: 'manual',
    };

    setScrapedCards([newCard, ...scrapedCards]);
    setUrl('');
    setIsLoading(false);
    toast.success('Card benefits extracted successfully!');
  };

  const handleRescheduleChange = (cardId: string, value: string) => {
    setScrapedCards(cards =>
      cards.map(card =>
        card.id === cardId
          ? { ...card, reschedule: value as ScrapedCard['reschedule'] }
          : card
      )
    );
    toast.success('Rescrape schedule updated');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Database className="size-6 text-gray-900" />
          <h2 className="text-2xl text-gray-900">Admin Scraper Dashboard</h2>
        </div>
        <p className="text-gray-500">
          Extract credit card benefits using LLM-powered web scraping
        </p>
      </div>

      {/* Desktop-only notice */}
      <div className="md:hidden bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ This admin panel is optimized for desktop viewing
        </p>
      </div>

      {/* Scraper Input */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Credit Card URL to Scrape</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/credit-card"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button
          onClick={handleRunExtractor}
          disabled={isLoading}
          className="w-full md:w-auto bg-black hover:bg-gray-800 text-white"
        >
          {isLoading ? (
            <>
              <Sparkles className="size-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Run LLM Extractor
            </>
          )}
        </Button>
      </div>

      {/* Data Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Card Name</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Benefits</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Last Scraped</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Auto-Rescrape</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scrapedCards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900">{card.name}</p>
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:underline truncate block max-w-xs"
                      >
                        {card.url}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {card.benefits.map((benefit, index) => (
                        <li key={index} className="text-sm text-gray-700">
                          • {benefit}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      {card.frequency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(card.lastScraped)}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={card.reschedule}
                      onValueChange={(value) => handleRescheduleChange(card.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
