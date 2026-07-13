'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Interview {
  id: string; stage: number; type: string;
  scheduledAt: string; durationMinutes: number;
  location?: string; meetingLink?: string;
  score?: number; feedback?: string; status: string;
  interviewerId: string;
}

interface Offer {
  id: string; baseSalary: number; allowance?: number;
  benefitDescription?: string; joinDate: string;
  status: string; sentAt?: string; acceptedAt?: string;
  notes?: string;
}

interface OnboardingDoc {
  id: string; docType: string; fileUrl: string; uploadedAt: string;
}

interface Application {
  id: string; status: string; appliedAt: string;
  expectedSalary?: number; notes?: string;
  candidate: { id: string; firstName: string; lastName: string; email: string; phone?: string; resumeUrl?: string };
  jobPosting: { id: string; title: string; description?: string };
  interviews: Interview[];
  offers: Offer[];
  onboardingDocuments?: OnboardingDoc[];
}

export default function ApplicationDetailPage() {
  const params = useParams(); const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['application', params.id];
  const { data: app, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<Application>(`/recruitment/applications/${params.id}`),
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handleStatusUpdate() {
    if (!newStatus) return;
    setActionLoading(true); setActionError('');
    try { await api.put(`/recruitment/applications/${params.id}/status`, { status: newStatus }); queryClient.invalidateQueries({ queryKey }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!app) return <p>Not found</p>;

  const statuses = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="m-0">{app.candidate.firstName} {app.candidate.lastName}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {app.candidate.email} · {app.candidate.phone || '—'} · {app.jobPosting.title}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            app.status === 'HIRED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            app.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>{app.status}</span>
        </div>
        {app.expectedSalary && <p className="text-xs">Expected: Rp {Number(app.expectedSalary).toLocaleString('id-ID')}</p>}

        <div className="flex gap-2 items-end mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Update Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              <option value="">— Select —</option>
              {statuses.filter((s: any) => s !== app.status).map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Button onClick={handleStatusUpdate} disabled={!newStatus || actionLoading}>
            {actionLoading ? '…' : 'Update'}
          </Button>
        </div>
      </Card>

      <h3 className="mb-2">Interviews ({app.interviews.length})</h3>
      {app.interviews.map((i: any) => (
        <Card key={i.id} className="max-w-[700px] mb-2">
          <div className="text-xs flex justify-between">
            <div>
              <strong>Stage {i.stage}</strong> · {i.type} · {new Date(i.scheduledAt).toLocaleDateString('id-ID')} {i.durationMinutes}min
              {i.score ? ` · Score: ${Number(i.score).toFixed(1)}` : ''}
            </div>
            <span>{i.status}{i.feedback ? ` · ${i.feedback}` : ''}</span>
          </div>
        </Card>
      ))}

      <h3 className="my-4 mb-2">Offers ({app.offers.length})</h3>
      {app.offers.map((o: any) => (
        <Card key={o.id} className="max-w-[700px] mb-2">
          <div className="text-xs">
            <div className="flex justify-between">
              <div><strong>Rp {Number(o.baseSalary).toLocaleString('id-ID')}</strong>{o.allowance ? ` + Rp ${Number(o.allowance).toLocaleString('id-ID')}` : ''}</div>
              <span>{o.status} · Join: {new Date(o.joinDate).toLocaleDateString('id-ID')}</span>
            </div>
            {o.benefitDescription && <p className="m-1 mt-0 text-gray-500 dark:text-gray-400">{o.benefitDescription}</p>}
          </div>
        </Card>
      ))}

      {app.offers.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">No offers yet.</p>}

      {app.onboardingDocuments && app.onboardingDocuments.length > 0 && (
        <>
          <h3 className="my-4 mb-2">Onboarding Documents ({app.onboardingDocuments.length})</h3>
          {app.onboardingDocuments.map((d: any) => (
            <Card key={d.id} className="max-w-[700px] mb-2">
              <div className="text-xs flex justify-between">
                <div><strong>{d.docType}</strong></div>
                <div className="text-gray-500 dark:text-gray-400">
                  {new Date(d.uploadedAt).toLocaleDateString('id-ID')}
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="ml-2 text-blue-500">View</a>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
