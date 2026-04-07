import { useState, useEffect } from 'react';
import { Bell, Mail, Download, Save, TrendingUp, CreditCard as CardIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { getSettings, saveSettings, getBenefits, getCards } from '../utils/storage';
import { UserSettings } from '../types';
import { toast } from 'sonner';

export default function Settings() {
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
      const reminderDate = new Date(expiryDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const formatICSDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

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
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-12">
      <header className="space-y-2">
        <h2 className="text-4xl font-extrabold text-slate-900">Settings & Notifications</h2>
        <p className="text-lg text-slate-500">Personalize your reward management experience</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="md:col-span-4 bg-white p-8 rounded-3xl shadow-lg space-y-6">
          <h3 className="text-2xl font-bold text-slate-900">Notification Preferences</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-sky-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Bell className="text-sky-600" />
                <div>
                  <Label htmlFor="push" className="text-lg">Push Notifications</Label>
                  <p className="text-sm text-slate-600">Receive alerts for expiring benefits</p>
                </div>
              </div>
              <Switch
                id="push"
                checked={settings.pushNotifications}
                onCheckedChange={() => handleToggle('pushNotifications')}
              />
            </div>

            <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="text-amber-600" />
                <div>
                  <Label htmlFor="email" className="text-lg">Email Reminders</Label>
                  <p className="text-sm text-slate-600">Daily digest of expiring benefits</p>
                </div>
              </div>
              <Switch
                id="email"
                checked={settings.emailReminders}
                onCheckedChange={() => handleToggle('emailReminders')}
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-full"
          >
            <Save className="mr-2" />
            Save Preferences
          </Button>
        </div>

        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-3xl text-white shadow-lg">
          <div className="space-y-4">
            <TrendingUp className="text-4xl" />
            <h3 className="text-2xl font-bold">Sync Your Success</h3>
            <p>Export your benefits to your calendar for automatic reminders.</p>
          </div>
          <Button
            onClick={handleExportICS}
            className="mt-6 w-full bg-white text-emerald-700 py-3 rounded-full"
          >
            <Download className="mr-2" />
            Export .ICS File
          </Button>
        </div>
      </div>

      <Separator />

      <section className="bg-white p-6 rounded-3xl shadow-lg">
        <h3 className="text-xl font-bold text-slate-900">About Rewards Tracker</h3>
        <p className="text-sm text-slate-600">Version 1.0.0 • A modern PWA for tracking credit card benefits</p>
        <p className="text-xs text-slate-500">All data is stored locally in your browser</p>
      </section>
    </div>
  );
}