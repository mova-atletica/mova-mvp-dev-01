import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ transform: 'translateY(-100px)', backgroundColor: 'var(--background)' }}>
      <div className="max-w-md w-full rounded-lg p-8 text-center border" style={{ 
        //backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 className="text-4xl font-thin mb-3" style={{ color: 'var(--foreground)' }}>404</h1>
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--foreground)' }}>Page Not Found</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--foreground)' }}>
          The exercise or page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-md font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: 'var(--primary-button-bg)', 
              color: 'var(--primary-button-text)',
              border: '1px solid var(--primary-button-border)'
            }}
          >
            Return Home
          </Link>
        </div>
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--foreground)' }}>
            Mova • Motion Analysis Platform
          </p>
        </div>
      </div>
    </div>
  );
}
