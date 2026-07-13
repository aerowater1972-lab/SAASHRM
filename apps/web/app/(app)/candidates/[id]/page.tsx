'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface CandidateApp {
  id: string;
  status: string;
  appliedAt: string;
  jobPosting: { id: string; title: string; status: string };
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  source?: string;
  currentCompany?: string;
  currentPosition?: string;
  notes?: string;
  status: string;
  createdAt: string;
  applications: CandidateApp[];
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: candidate, error: queryError, isLoading: loading } = useQuery({
    queryKey: ['candidate', params.id],
    queryFn: () => api.get<Candidate>(`/recruitment/candidates/${params.id}`),
  });
  const error = queryError instanceof Error ? queryError.message : '';

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!candidate) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="m-0">{candidate.firstName} {candidate.lastName}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {candidate.email} · {candidate.phone || '—'}
            </p>
            {candidate.currentPosition && (
              <p className="m-0.5 text-xs">
                {candidate.currentPosition}{candidate.currentCompany ? ` @ ${candidate.currentCompany}` : ''}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {candidate.status}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-1 mt-1">Source: {candidate.source || '—'}</p>
          </div>
        </div>

        {candidate.notes && <p className="text-xs italic">{candidate.notes}</p>}
      </Card>

      <h3 className="mb-2">Applications ({candidate.applications.length})</h3>
      {candidate.applications.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-xs">No applications.</p>}
      {candidate.applications.map((a: any) => (
        <Card key={a.id} className="max-w-[700px] mb-2 cursor-pointer"
          onClick={() => router.push(`/jobs/${a.jobPosting.id}`)}>
          <div className="flex justify-between text-xs">
            <div>
              <strong>{a.jobPosting.title}</strong>
              <span className="text-gray-500 dark:text-gray-400 ml-2">{a.status}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400">{new Date(a.appliedAt).toLocaleDateString('id-ID')}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
