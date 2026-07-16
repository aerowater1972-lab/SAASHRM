'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUpdateEssPreferences } from '@/lib/hooks/ess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageSkeleton } from '@/components/ui/data-states';

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: initialPrefs, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => api.get<any>('/ess/preferences'),
  });

  useEffect(() => { if (initialPrefs) setPrefs(initialPrefs); }, [initialPrefs]);

  if (isLoading) return <PageSkeleton />;

  const updatePreferences = useUpdateEssPreferences();

  async function handleSave() {
    try { await updatePreferences.mutateAsync(prefs); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Preferences</h1>
        <p className="text-sm text-muted-foreground">Pengaturan preferensi akun</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <Card className="max-w-md">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={prefs.language || 'id'} onValueChange={(v) => setPrefs({...prefs, language: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notification Email</Label>
            <Input type="email" value={prefs.notificationEmail || ''} onChange={(e) => setPrefs({...prefs, notificationEmail: e.target.value})} placeholder="Email for notifications" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.smsNotification ?? true} onChange={(e) => setPrefs({...prefs, smsNotification: e.target.checked})} className="rounded border-input h-4 w-4" />
            SMS Notifications
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.emailNotification ?? true} onChange={(e) => setPrefs({...prefs, emailNotification: e.target.checked})} className="rounded border-input h-4 w-4" />
            Email Notifications
          </label>

          <Button onClick={handleSave}>{saved ? '✓ Tersimpan' : 'Simpan'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
