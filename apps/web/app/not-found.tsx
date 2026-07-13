import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 64, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>404</div>
      <h2 style={{ margin: '0 0 8px' }}>Page not found</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 24px' }}>The page you are looking for does not exist.</p>
      <Link href="/dashboard" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Go to Dashboard</Link>
    </div>
  );
}
