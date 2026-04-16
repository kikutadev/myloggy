import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MiniApp from './MiniApp';
import './mini-styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniApp />
  </StrictMode>,
);
