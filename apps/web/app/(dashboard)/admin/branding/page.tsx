'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBranding, useUpsertBranding } from '@/lib/hooks/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton, ErrorState } from '@/components/ui/data-states';

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Format hex warna (#RRGGBB)'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Format hex warna (#RRGGBB)'),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
});
type BrandingForm = z.infer<typeof brandingSchema>;

export default function BrandingPage() {
  const { data: branding, isLoading, error, refetch } = useBranding();
  const upsertMutation = useUpsertBranding();

  const form = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { primaryColor: '#2563EB', secondaryColor: '#7C3AED', logoUrl: '', faviconUrl: '' },
  });

  useEffect(() => {
    if (branding) {
      form.reset({
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        logoUrl: branding.logoUrl || '',
        faviconUrl: branding.faviconUrl || '',
      });
    }
  }, [branding, form]);

  async function onSubmit(data: BrandingForm) {
    await upsertMutation.mutateAsync(data);
    refetch();
  }

  const primaryColor = form.watch('primaryColor');
  const secondaryColor = form.watch('secondaryColor');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Branding Tenant</h2>
        <p className="text-sm text-muted-foreground">Konfigurasi warna brand dan logo untuk tampilan perusahaan Anda.</p>
      </div>

      {isLoading && <TableSkeleton rows={3} columns={2} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {branding && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Preview Warna</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="space-y-1 text-center">
                  <div className="h-12 w-24 rounded-md border" style={{ backgroundColor: primaryColor }} />
                  <span className="text-xs text-muted-foreground">{primaryColor}</span>
                  <p className="text-xs">Primary</p>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-12 w-24 rounded-md border" style={{ backgroundColor: secondaryColor }} />
                  <span className="text-xs text-muted-foreground">{secondaryColor}</span>
                  <p className="text-xs">Secondary</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={primaryColor} onChange={e => form.setValue('primaryColor', e.target.value)} className="w-12 p-1 h-10" />
                  <Input {...form.register('primaryColor')} placeholder="#2563EB" />
                </div>
                {form.formState.errors.primaryColor && <p className="text-xs text-destructive">{form.formState.errors.primaryColor.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={secondaryColor} onChange={e => form.setValue('secondaryColor', e.target.value)} className="w-12 p-1 h-10" />
                  <Input {...form.register('secondaryColor')} placeholder="#7C3AED" />
                </div>
                {form.formState.errors.secondaryColor && <p className="text-xs text-destructive">{form.formState.errors.secondaryColor.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input {...form.register('logoUrl')} placeholder="https://storage.example.com/logo.png" />
            </div>
            <div className="space-y-2">
              <Label>Favicon URL</Label>
              <Input {...form.register('faviconUrl')} placeholder="https://storage.example.com/favicon.ico" />
            </div>

            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan Branding'}
            </Button>
            {upsertMutation.isSuccess && <p className="text-xs text-green-600">Branding berhasil disimpan.</p>}
          </form>
        </>
      )}
    </div>
  );
}
