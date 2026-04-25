// =============================
// NOVAPULSE SERVICE WORKER
// =============================

self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installé");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activé");
});


// =============================
// PUSH EVENT
// =============================

self.addEventListener("push", (event) => {

  console.log("📩 Push reçu");

  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    console.log("⚠️ Push data non JSON");
  }

  const title = data.title || "NovaPulse";
  const body = data.body || "Nouveau message reçu";
  const url = data.url || "/";

  const options = {
    body: body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: url
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );

});


// =============================
// CLICK NOTIFICATION
// =============================

self.addEventListener("notificationclick", (event) => {

  console.log("🖱 Notification cliquée");

  event.notification.close();

  const url = event.notification.data.url || "/";

  event.waitUntil(
    clients.openWindow(url)
  );

});