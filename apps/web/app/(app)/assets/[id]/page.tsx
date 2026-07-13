'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Assignment {
  id: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
  employee: { id: string; fullName: string; employeeId: string };
}

interface Asset {
  id: string;
  code: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  assignments: Assignment[];
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: asset, error: queryError, isLoading: loading } = useQuery({
    queryKey: ['asset', params.id],
    queryFn: () => api.get<Asset>(`/assets/${params.id}`),
  });
  const error = queryError instanceof Error ? queryError.message : '';

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!asset) return <p>Not found</p>;

  const activeAssignment = asset.assignments?.find((a: any) => !a.returnedAt);

  const statusColor = asset.status === 'AVAILABLE' ? 'text-green-500 bg-green-500/10' : asset.status === 'ASSIGNED' ? 'text-blue-500 bg-blue-500/10' : asset.status === 'MAINTENANCE' ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10';

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-2xl mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="m-0">{asset.name}</h3>
            <p className="m-1 text-gray-400 text-xs">
              {asset.code} · {asset.category} · {asset.brand || '—'} {asset.model || ''}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${statusColor}`}>{asset.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div><strong>Serial Number</strong><br />{asset.serialNumber || '—'}</div>
          <div><strong>Location</strong><br />{asset.location || '—'}</div>
          <div><strong>Purchase Date</strong><br />{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID') : '—'}</div>
          <div><strong>Purchase Price</strong><br />{asset.purchasePrice ? `Rp ${Number(asset.purchasePrice).toLocaleString('id-ID')}` : '—'}</div>
          <div><strong>Warranty</strong><br />{asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString('id-ID') : '—'}</div>
        </div>

        {activeAssignment && (
          <div className="bg-blue-500/10 p-3 rounded-lg mb-4 text-xs">
            <strong>Currently assigned to:</strong> {activeAssignment.employee.fullName}
            <span className="text-gray-400 ml-2">since {new Date(activeAssignment.assignedAt).toLocaleDateString('id-ID')}</span>
          </div>
        )}

        {asset.notes && <p className="text-xs italic mb-4">{asset.notes}</p>}
      </Card>

      <h3 className="mb-2">Assignment History</h3>
      {asset.assignments.length === 0 && <p className="text-gray-400 text-xs">No assignment history.</p>}
      {asset.assignments.map((a: any) => (
        <Card key={a.id} className="max-w-2xl mb-2">
          <div className="flex justify-between text-xs">
            <div>
              <strong>{a.employee.fullName}</strong>
              <span className="text-gray-400 ml-2">
                {new Date(a.assignedAt).toLocaleDateString('id-ID')}
                {a.returnedAt ? ` → ${new Date(a.returnedAt).toLocaleDateString('id-ID')}` : ' (Active)'}
              </span>
            </div>
            <span>{a.notes || ''}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
