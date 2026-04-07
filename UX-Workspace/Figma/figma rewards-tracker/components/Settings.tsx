import { useState, useEffect } from 'react';
import { Bell, Mail, Download, Save, TrendingUp, CreditCard as CardIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { getSettings, saveSettings, getBenefits, getCards } from '../utils/storage';
import { UserSettings } from '../types';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/calculations';

export function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    pushNotifications: true,
    emailReminders: false,
  });

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleToggle = (key: keyof UserSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Settings saved successfully!');
  };

  const handleExportICS = () => {
    const benefits = getBenefits();
    
    // Create ICS file content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rewards Tracker//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Credit Card Benefits',
      'X-WR-TIMEZONE:UTC',
    ];

    benefits.forEach((benefit) => {
      const expiryDate = new Date(benefit.expiresAt);
      const reminderDate = new Date(expiryDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before
      
      const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${benefit.id}@rewardstracker.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(reminderDate)}`,
        `DTEND:${formatICSDate(expiryDate)}`,
        `SUMMARY:${benefit.title} - ${benefit.cardName}`,
        `DESCRIPTION:Benefit value: $${benefit.value}\\nExpires: ${expiryDate.toLocaleDateString()}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT3D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${benefit.title} expires in 3 days`,
        'END:VALARM',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    // Create and download file
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'credit-card-benefits.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Calendar file exported!');
  };

  const cards = getCards();
  const benefits = getBenefits();
  const activeBenefits = benefits.filter(b => !b.isUsed && new Date(b.expiresAt) > new Date()).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl text-gray-900">Settings & Notifications</h2>
        <p className="text-gray-500">Manage how you receive benefit reminders</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-sm">
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <CardIcon className="size-4" />
            <span className="text-sm">Cards</span>
          </div>
          <p className="text-2xl text-gray-900 font-semibold">{cards.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <TrendingUp className="size-4" />
            <span className="text-sm">Active Benefits</span>
          </div>
          <p className="text-2xl text-gray-900 font-semibold">{activeBenefits}</p>
        </div>
      </div>

      <Separator />

      {/* Notification Preferences */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg text-gray-900 mb-4">Notification Preferences</h3>
          
          <div className="space-y-6">
            {/* Push Notifications */}
            <div className="flex items-start justify-between gap-4 bg-white p-4 rounded-xl border border-sky-200">
              <div className="flex items-start gap-3 flex-1">
                <Bell className="size-5 text-sky-600 mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="push" className="text-base cursor-pointer">
                    Push Notifications (In-App)
                  </Label>
                  <p className="text-sm text-gray-600">
                    Receive browser notifications when benefits are about to expire
                  </p>
                </div>
              </div>
              <Switch
                id="push"
                checked={settings.pushNotifications}
                onCheckedChange={() => handleToggle('pushNotifications')}
              />
            </div>

            <Separator />

            {/* Email Reminders */}
            <div className="flex items-start justify-between gap-4 bg-white p-4 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3 flex-1">
                <Mail className="size-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-base cursor-pointer">
                    Email Reminders
                  </Label>
                  <p className="text-sm text-gray-600">
                    Get daily digest emails about upcoming expiring benefits
                  </p>
                </div>
              </div>
              <Switch
                id="email"
                checked={settings.emailReminders}
                onCheckedChange={() => handleToggle('emailReminders')}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg"
        >
          <Save className="size-4 mr-2" />
          Save Preferences
        </Button>
      </section>

      <Separator />

      {/* Export Calendar */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg text-gray-900 mb-1">Calendar Integration</h3>
          <p className="text-sm text-gray-500">
            Export your benefits as a calendar file to sync with your favorite calendar app
          </p>
        </div>

        <Button
          onClick={handleExportICS}
          variant="outline"
          className="w-full border-sky-600 text-sky-600 hover:bg-sky-50"
        >
          <Download className="size-4 mr-2" />
          Export as .ICS Calendar File
        </Button>

        <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-200">
          <p className="text-sm text-cyan-900">
            💡 <strong>Tip:</strong> Import this file into Google Calendar, Apple Calendar, 
            Outlook, or any other calendar app to get automatic reminders for your benefits.
          </p>
        </div>
      </section>

      <Separator />

      {/* App Info */}
      <section className="bg-white p-6 rounded-xl space-y-2 border border-gray-200">
        <h3 className="text-sm text-gray-900 font-semibold">About Rewards Tracker</h3>
        <p className="text-sm text-gray-600">
          Version 1.0.0 • A modern PWA for tracking credit card benefits
        </p>
        <p className="text-xs text-gray-500">
          All data is stored locally in your browser
        </p>
      </section>
    </div>
  );
}