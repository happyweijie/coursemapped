import { Moon, Sun } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import type { Theme } from '../lib/theme';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  basketCount: number;
}

export default function Header({ theme, onToggleTheme, basketCount }: Props) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="logo">
          course<span className="logo-accent">mapped</span>
        </Link>
        <nav className="site-nav">
          <NavLink to="/" end>
            Search
          </NavLink>
          <NavLink to="/basket">
            Basket
            {basketCount > 0 && <span className="basket-count">{basketCount}</span>}
          </NavLink>
        </nav>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
