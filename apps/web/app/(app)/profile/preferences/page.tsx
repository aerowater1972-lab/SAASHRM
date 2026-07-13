'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: initialPrefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => api.get<any>('/ess/preferences'),
  });

  useEffect(() => { if (initialPrefs) setPrefs(initialPrefs); }, [initialPrefs]);

  async function handleSave() {
    try { await api.post('/ess/preferences', prefs); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">My Preferences</h2>
      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
      <Card className="max-w-md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Language</label>
            <select value={prefs.language || 'id'} onChange={e => setPrefs({...prefs, language: e.target.value})}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notification Email</label>
            <input type="email" value={prefs.notificationEmail || ''} onChange={e => setPrefs({...prefs, notificationEmail: e.target.value})} placeholder="Email for notifications"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.smsNotification ?? true} onChange={e => setPrefs({...prefs, smsNotification: e.target.checked})} className="rounded border-gray-300" />
            SMS Notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.emailNotification ?? true} onChange={e => setPrefs({...prefs, emailNotification: e.target.checked})} className="rounded border-gray-300" />
            Email Notifications
          </label>
          <Button onClick={handleSave}>{saved ? '✓ Saved' : 'Save'}</Button>
        </div>
      </Card>
    </div>
  );
}
