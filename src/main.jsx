import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// =============================
// NOVAPULSE - SERVICE WORKER
// =============================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js");
      console.log("🔧 Service Worker enregistré :", reg.scope);
    } catch (err) {
      console.error("❌ Service Worker erreur :", err);
    }
  });
}