import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <div className="empty-state">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="3" />
            <path
              d="M28 28l24 24M52 28L28 52"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Page not found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}
