/**
 * MELO Frontend — Entry Point
 * 
 * Autonomous Intelligence Command Center
 */
import './styles/main.css';
import { initApp } from './App.js';

// Boot
const app = document.getElementById('app');
if (app) {
  initApp(app);
} else {
  console.error('[MELO] #app element not found');
}
