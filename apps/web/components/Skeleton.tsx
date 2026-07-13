export function Skeleton({ width, height, style }: { width?: number | string; height?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: width || '100%', height: height || 16, borderRadius: 6,
      background: 'var(--border)', opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} width={`${100 / cols}%`} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <Skeleton width="60%" height={18} style={{ marginBottom: 12 }} />
          <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </div>
      ))}
    </div>
  );
}
