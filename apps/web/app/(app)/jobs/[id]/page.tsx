'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  candidate: { id: string; firstName: string; lastName: string; email: string };
}

interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  employmentType?: string;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  slots: number;
  filledSlots: number;
  status: string;
  postedAt?: string;
  closedAt?: string;
  createdAt: string;
  applications: Application[];
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['job', params.id];
  const { data: job, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<JobPosting>(`/recruitment/jobs/${params.id}`),
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handlePublish() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/recruitment/jobs/${params.id}/publish`, {}); queryClient.invalidateQueries({ queryKey }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleClose() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/recruitment/jobs/${params.id}/close`, {}); queryClient.invalidateQueries({ queryKey }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!job) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="m-0">{job.title}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {job.employmentType?.replace('_', ' ') || '—'} · {job.location || 'Remote'} · {job.filledSlots}/{job.slots} filled
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            job.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            job.status === 'CLOSED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>{job.status}</span>
        </div>

        {job.minSalary && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Salary: Rp {Number(job.minSalary).toLocaleString('id-ID')} – Rp {Number(job.maxSalary).toLocaleString('id-ID')}
          </p>
        )}

        <div className="text-sm mb-4">
          <h4 className="my-3 mb-1">Description</h4>
          <p className="whitespace-pre-wrap m-0">{job.description}</p>
        </div>

        {job.requirements && (
          <div className="text-sm mb-4">
            <h4 className="my-3 mb-1">Requirements</h4>
            <p className="whitespace-pre-wrap m-0">{job.requirements}</p>
          </div>
        )}

        {job.responsibilities && (
          <div className="text-sm mb-4">
            <h4 className="my-3 mb-1">Responsibilities</h4>
            <p className="whitespace-pre-wrap m-0">{job.responsibilities}</p>
          </div>
        )}

        {job.status === 'DRAFT' && (
          <Button onClick={handlePublish} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white border-none">
            {actionLoading ? '…' : 'Publish'}
          </Button>
        )}
        {job.status === 'PUBLISHED' && (
          <Button onClick={handleClose} disabled={actionLoading} variant="danger">
            {actionLoading ? '…' : 'Close'}
          </Button>
        )}
      </Card>

      <h3 className="mb-2">Applicants ({job.applications.length})</h3>
      <Card className="max-w-[700px]">
        {job.applications.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0">No applications yet.</p>
        )}
        {job.applications.map((a: any) => (
          <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 text-xs last:border-b-0">
            <div>
              <strong>{a.candidate.firstName} {a.candidate.lastName}</strong>
              <span className="text-gray-500 dark:text-gray-400 ml-2">{a.candidate.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{a.status}</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {new Date(a.appliedAt).toLocaleDateString('id-ID')}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
