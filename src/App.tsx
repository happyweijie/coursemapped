import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import { useBasket } from './lib/basket';
import { useTheme } from './lib/theme';
import BasketPage from './pages/BasketPage';
import SearchPage from './pages/SearchPage';

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const basket = useBasket();

  return (
    <BrowserRouter>
      <Header theme={theme} onToggleTheme={toggleTheme} basketCount={basket.length} />
      <main className="container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/basket" element={<BasketPage />} />
          <Route path="*" element={<p className="notice">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        Mapping data scraped from NUS EduRec; course titles from{' '}
        <a href="https://nusmods.com" target="_blank" rel="noreferrer">
          NUSMods
        </a>
        . Not affiliated with NUS — always confirm mappings with your faculty.
      </footer>
    </BrowserRouter>
  );
}
