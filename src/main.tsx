import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './design-system/ThemeProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
