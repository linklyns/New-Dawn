import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-slate-navy py-6 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p className="text-sm text-white/70">
          &copy; {new Date().getFullYear()} New Dawn. All rights reserved.
        </p>
        <Link
          to="/privacy"
          className="text-sm text-white/70 transition-colors hover:text-white"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
