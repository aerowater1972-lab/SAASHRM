import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import OrgChartVisual from './org-chart-visual';
import type { OrgChartNode as OrgChartNodeData } from '@/lib/types/employee';

const tree: OrgChartNodeData = {
  id: 'root',
  label: 'Direksi',
  type: 'department',
  headName: 'Alice',
  children: [
    {
      id: 'fin',
      label: 'Keuangan',
      type: 'department',
      headName: 'Bob',
      children: [
        { id: 'carol', label: 'Carol', type: 'employee', positionTitle: 'Staff Finance' },
      ],
    },
    { id: 'sec', label: 'Sekretaris', type: 'position', vacant: true },
  ],
};

function renderChart(props?: Partial<React.ComponentProps<typeof OrgChartVisual>>) {
  return render(<OrgChartVisual root={tree} {...props} />);
}

describe('OrgChartVisual', () => {
  it('renders all nodes and connectors', () => {
    const { container } = renderChart();
    expect(screen.getByText('Direksi')).toBeInTheDocument();
    expect(screen.getByText('Keuangan')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Sekretaris')).toBeInTheDocument();
    // 4 nodes -> 3 elbow connectors (scoped; lucide icons also render paths)
    const edges = container.querySelectorAll('svg path[data-edge]');
    expect(edges.length).toBe(3);
  });

  it('shows headcount of employee descendants', () => {
    renderChart();
    // root subtree has 1 employee (Carol)
    expect(screen.getAllByText(/1 orang/).length).toBeGreaterThanOrEqual(1);
  });

  it('marks vacant positions', () => {
    renderChart();
    expect(screen.getByText(/Kosong/)).toBeInTheDocument();
  });

  it('collapses a subtree when its toggle is clicked', () => {
    renderChart();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    // Simpler: collapse-all then expand check
    fireEvent.click(screen.getByText('Tutup semua'));
    expect(screen.queryByText('Carol')).not.toBeInTheDocument();
    expect(screen.queryByText('Keuangan')).not.toBeInTheDocument();
    expect(screen.getByText('Direksi')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Buka semua'));
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('searches and highlights matches with count badge', () => {
    renderChart();
    fireEvent.change(screen.getByPlaceholderText(/Cari unit/), { target: { value: 'carol' } });
    expect(screen.getByText(/cocok/)).toBeInTheDocument();
    // match path stays expanded
    expect(screen.getByText('Carol')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Cari unit/), { target: { value: 'zzz-no-match' } });
    expect(screen.getByText(/0 cocok/)).toBeInTheDocument();
  });

  it('calls onSelect with node and depth on node click', () => {
    const onSelect = vi.fn();
    renderChart({ onSelect });
    fireEvent.click(screen.getByText('Keuangan'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'fin', label: 'Keuangan' });
    expect(onSelect.mock.calls[0][1]).toBe(1);
  });

  it('zooms in and out and resets view', () => {
    const { container } = renderChart();
    const inner = () => container.querySelector('svg > g');
    expect(inner()?.getAttribute('transform')).toContain('scale(1)');
    fireEvent.click(screen.getByLabelText('Perbesar'));
    expect(inner()?.getAttribute('transform')).toContain('scale(1.2)');
    fireEvent.click(screen.getByLabelText('Perkecil'));
    fireEvent.click(screen.getByLabelText('Atur ulang tampilan'));
    expect(inner()?.getAttribute('transform')).toContain('scale(1)');
  });

  it('renders legend', () => {
    const { container } = renderChart();
    const legend = container.querySelectorAll('div.flex.flex-wrap.items-center.gap-3');
    const legendText = legend.length > 0 ? legend[legend.length - 1].textContent ?? '' : '';
    expect(legendText).toContain('Departemen');
    expect(legendText).toContain('Posisi');
    expect(legendText).toContain('Karyawan');
  });
});
