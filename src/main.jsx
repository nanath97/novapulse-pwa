import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'


function removeSplash() {
  const splash = document.getElementById("splash");

  if (splash) {
    splash.style.transition = "opacity 0.4s ease";
    splash.style.opacity = "0";

    setTimeout(() => {
      splash.remove();
    }, 400);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// 💥 ON SUPPRIME LE SPLASH ICI
const MIN_SPLASH_TIME = 3000; // 2.2 secondes

window.addEventListener("DOMContentLoaded", () => {
  const start = Date.now();

  const checkReady = () => {
    const elapsed = Date.now() - start;

    if (elapsed >= MIN_SPLASH_TIME) {
      removeSplash();
    } else {
      setTimeout(removeSplash, MIN_SPLASH_TIME - elapsed);
    }
  };

  checkReady();
});

// =============================
// NOVAPULSE - SERVICE WORKER
// =============================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js");
      console.log("🔧 Service Worker enregistré :", reg.scope);

      window.addEventListener("click", () => {
        console.log("🖱 Interaction utilisateur détectée");
        subscribePush();
      }, { once: true });

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
  window.subscribePush = subscribePush;
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
    try {

  const email = localStorage.getItem("pwa_client_email");
  if (!email) {
  console.log("⚠️ Pas d'email client, subscription ignorée");
  return;
}

  const sellerSlug = localStorage.getItem("pwa_seller_slug");

  console.log("📨 Envoi subscription au bridge...");
  console.log("Email:", email);
  console.log("Seller:", sellerSlug);

  await fetch("https://novapulse-bridge.onrender.com/pwa/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      sellerSlug,
      subscription
    })
  });

  console.log("✅ Subscription envoyée au serveur");

} catch (err) {

  console.error("❌ Erreur envoi subscription :", err);

}

  } catch (err) {
    console.error("❌ Erreur subscription push :", err);
  }
}