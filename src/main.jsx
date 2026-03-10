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
      subscribePush();
    } catch (err) {
      console.error("❌ Service Worker erreur :", err);
    }
  });
}

// =============================
// NOVAPULSE - PUSH SUBSCRIPTION
// =============================

const VAPID_PUBLIC_KEY = "BOEK4xcHTdyVVx2wQ0IZcD7Z-GA_768YpYsD-Q3Hx3TrY6WF9FXrCOPY205GFenlV65rpz2yvPXba2Pz4B1Up3M";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function subscribePush() {
  try {

    console.log("🔔 Demande permission notification...");

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Permission refusée");
      return;
    }

    console.log("✅ Permission accordée");

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log("📡 Subscription push créée :", subscription);

  } catch (err) {
    console.error("❌ Erreur subscription push :", err);
  }
}