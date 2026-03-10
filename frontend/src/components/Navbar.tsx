import { useState, useRef, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Flame, Menu, X } from 'lucide-react';

const navLinks = [
  { to: '/#about', label: 'About' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/#services', label: 'Services' },
  { to: '/#contact', label: 'Contact' },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-civic-navy-light bg-civic-navy/95 backdrop-blur">
      <nav ref={navRef} className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-gray-300 hover:bg-gray-800 hover:text-white md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-xl font-semibold text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-civic-orange text-white">
              <Flame className="h-5 w-5" />
            </span>
            <span className="text-civic-navy-light md:inline">CIVIC</span>
            <span className="text-civic-orange">RISE</span>
          </Link>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className="text-sm text-gray-300 hover:text-white">
              {label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/signin"
            className="rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-civic-orange hover:bg-gray-800"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-civic-orange px-4 py-2 text-sm font-medium text-white hover:bg-civic-orange-hover"
          >
            Sign Up
          </Link>
        </div>
      </nav>
      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="border-t border-civic-navy-light bg-civic-navy/98 px-4 py-4 md:hidden">
          <ul className="space-y-2">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-700 pt-4">
            <Link
              to="/signin"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-center text-sm font-medium text-civic-orange hover:bg-gray-800"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg bg-civic-orange px-4 py-2 text-center text-sm font-medium text-white hover:bg-civic-orange-hover"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
