import "./App.css";
import sendIcon from "./assets/send.png";
import blurImg from "./assets/blur.png";
import installVideo from "./assets/install_pwa.mp4";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";







const BRIDGE_URL = "https://novapulse-bridge.onrender.com";

function App() {
  
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [emailInput, setEmailInput] = useState("");
  const [clientEmail, setClientEmail] = useState(null);
  const [isIdentified, setIsIdentified] = useState(false);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [messages, setMessages] = useState([]);
  const [topicId, setTopicId] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [missedCount, setMissedCount] = useState(0);
  const [showServices, setShowServices] = useState(false);
  const [sellerConfig, setSellerConfig] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentsPending, setPaymentsPending] = useState([]);
  const [paymentsPaid, setPaymentsPaid] = useState([]);
  const notificationSoundRef = useRef(null);
  const [showInstallVideo, setShowInstallVideo] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  
  
function getDownloadUrl(mediaUrl, fileName, mediaType) {
  if (!mediaUrl) return "";

  const name = String(fileName || "").toLowerCase();

  // seulement pour les documents
  if (mediaType !== "document") return mediaUrl;

  const isPdf = name.endsWith(".pdf") || mediaUrl.toLowerCase().includes(".pdf");
  const isCloudinaryRaw =
    mediaUrl.includes("res.cloudinary.com") && mediaUrl.includes("/raw/upload/");

  // Si Cloudinary RAW + pas d'extension .pdf dans l'URL mais le fichier est censé être un PDF -> on force .pdf
  if (isCloudinaryRaw && isPdf && !mediaUrl.toLowerCase().includes(".pdf")) {
    return `${mediaUrl}.pdf`;
  }

  return mediaUrl;
}



// Masque visuellement /envXX dans les messages admin
const maskEnvCommand = (text) => {
  if (!text) return "";
  return text.replace(/\/env[\d.,]+/gi, "").trim();
};



  // Notes (admin mode only)
  const [adminNote, setAdminNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const fileInputRef = useRef(null);

const handleClientMedia = async (e) => {
  console.log("🧪 handleClientMedia triggered");
  console.log("📧 clientEmail:", clientEmail);
  console.log("🏷️ sellerSlug:", sellerSlug);

  const file = e.target.files?.[0];
  console.log("📁 File selected:", file);

  if (!file) return;
  if (!clientEmail) return;

  try {
    let localType = "photo";
    if (file.type.startsWith("video")) localType = "video";
    else if (file.type.includes("pdf")) localType = "document";

    const localUrl = URL.createObjectURL(file);

    setMessages((prev) => [
      ...prev,
      {
        from: "client",
        type: "media",
        mediaType: localType,
        url: localUrl,
        fileName: file.name,
        text: "",
      },
    ]);

    const formData = new FormData();
    formData.append("file", file);

    const uploadResp = await fetch(`${BRIDGE_URL}/upload-media`, {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadResp.json();
    const mediaUrl = uploadData.mediaUrl;

    if (!mediaUrl) {
      console.error("❌ mediaUrl missing in upload response");
      return;
    }

    let mediaType = "photo";
    if (file.type.startsWith("video")) mediaType = "video";
    else mediaType = "document";

    await fetch(`${BRIDGE_URL}/pwa/client-send-media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: clientEmail,
        sellerSlug,
        mediaUrl,
        mediaType,
        fileName: file.name,
      }),
    });

  } catch (err) {
    console.error("❌ handleClientMedia error:", err);
  }
};

// 🔑 Récupère le slug depuis l’URL : /coach-matthieu

  const getSellerSlugFromUrl = () => {
  const path = window.location.pathname; // ex: "/coach-matthieu"
  const slug = path.replace("/", "").trim().toLowerCase();
  return slug || "coach-matthieu"; // fallback sécurité si accès racine
};

const sellerSlug = getSellerSlugFromUrl();
console.log("🌐 sellerSlug détecté depuis URL:", sellerSlug);



  // Admin mode: open with ?admin=1 (doesn't impact clients)
  const isAdminMode =
    new URLSearchParams(window.location.search).get("admin") === "1";

  // ===============================
  // SESSION INIT + MODE DETECTION
  // ===============================
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    const handleBeforeUnload = () => {
      localStorage.removeItem("pwa_client_email");
      localStorage.removeItem("pwa_topic_id");
      localStorage.removeItem("pwa_is_new");
    };

    // Si PAS en mode PWA (donc navigateur web), on supprime la session à la fermeture
    if (!isStandalone) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    const storedEmail = localStorage.getItem("pwa_client_email");
    const storedTopic = localStorage.getItem("pwa_topic_id");
    const storedIsNew = localStorage.getItem("pwa_is_new");

    if (storedEmail && storedTopic) {
      setClientEmail(storedEmail);
      setTopicId(String(storedTopic));
      setIsNewClient(storedIsNew === "true");
      setIsIdentified(true);
    }

    setIsCheckingStorage(false);

    return () => {
      if (!isStandalone) {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
  }, []);
  useEffect(() => {
  notificationSoundRef.current = new Audio(`${import.meta.env.BASE_URL}notification.mp3`);
  notificationSoundRef.current.volume = 0.7;
}, []);
  useEffect(() => {
    const unlockAudio = () => {
      const audio = notificationSoundRef.current;
      if (!audio) return;

      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});

      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
    };
  }, []);

useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
}, [messages]);

useEffect(() => {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    setIsPWAInstalled(true);
  }
}, []);


useEffect(() => {
  const loadSellerConfig = async () => {
    try {
      const res = await fetch(`/sellers/${sellerSlug}/config.json`);
      const data = await res.json();
      setSellerConfig(data);
    } catch (err) {
      console.error("Erreur chargement config vendeur", err);
    }
  };

  loadSellerConfig();
}, [sellerSlug]);
// ===============================
// LOAD MISSED COUNT (OFFLINE BADGE)
// ===============================
const loadMissedCount = async () => {
  if (!clientEmail) return 0;

  try {
    const url = `${BRIDGE_URL}/pwa/missed-count?email=${encodeURIComponent(
      clientEmail
    )}&sellerSlug=${encodeURIComponent(sellerSlug)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data?.success) {
      const n = Number(data.missed || 0);
      setMissedCount(n);
      return n;
    }
  } catch (err) {
    console.error("❌ loadMissedCount error:", err);
  }

  return 0;
};

// ✅ SOUND NOTIFICATION (inchangé)
const playNotificationSound = () => {
  try {
    const audio = notificationSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Certains navigateurs bloquent sans interaction user
      });
    }
  } catch (e) {
    console.error("❌ sound error:", e);
  }
};
// ===============================
// SOCKET INIT
// ===============================
useEffect(() => {
  if (!isIdentified || !clientEmail) return;

  const socket = io(BRIDGE_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
  });

  socketRef.current = socket;

  let heartbeatInterval = null;

  socket.on("connect", async () => {
  console.log("✅ Connected:", socket.id);

  socket.emit("init", { email: clientEmail, sellerSlug });

  loadPurchasedContent();

  // ✅ récupère le nombre de messages manqués
  const n = await loadMissedCount();

  // ✅ si on a raté des messages -> recharge l’historique automatiquement
  if (n > 0) {
    await loadHistory();
  }

  // 💓 HEARTBEAT
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  socket.emit("heartbeat");
  heartbeatInterval = setInterval(() => {
    socket.emit("heartbeat");
  }, 20000);
});
// 👁 Envoi état visibilité initial + listener
  const handleVisibility = () => {
    socket.emit("pwa_visibility", {
      isVisible: document.visibilityState === "visible"
    });
  };

  document.addEventListener("visibilitychange", handleVisibility);

  // envoyer état initial
  handleVisibility();
  // ⬇️ C’EST ICI qu’on modifie les handlers entrants

  socket.on("admin_message", (data) => {
  const text = data?.text ?? "";
  setMessages((prev) => [...prev, { text, from: "admin", type: "text" }]);
  playNotificationSound();
  setMissedCount((c) => c + 1);
});

  socket.on("admin_media", (data) => {
  const type = data?.type;
  const url = data?.url;
  const fileName = data?.fileName;
  const text = data?.text ?? "";

  setMessages((prev) => [
    ...prev,
    {
      from: "admin",
      type: "media",
      mediaType: type,
      url,
      fileName,
      text,
    },
  ]);
  playNotificationSound();
  setMissedCount((c) => c + 1);
});

  socket.on("paid_content_locked", (data) => {
    setMessages((prev) => [
      ...prev,
      {
        text: data?.text ?? "",
        from: "admin",
        type: "locked",
        checkout_url: data?.checkout_url ?? "",
        amount: Number(data?.amount ?? 0),
      },
    ]);
    playNotificationSound();
    setMissedCount((c) => c + 1);
});

  socket.on("simple_payment_request", (data) => {
    setMessages((prev) => [
      ...prev,
      {
        text: data?.text ?? "",
        from: "admin",
        type: "simple_payment",
        checkout_url: data?.checkout_url ?? "",
        amount: Number(data?.amount ?? 0),
      },
    ]);
    playNotificationSound();
    setMissedCount((c) => c + 1);
});

  socket.on("paid_content_unlocked", (data) => {
    console.log("🔓 paid_content_unlocked:", data);
    setMessages((prev) => [
      ...prev,
      {
        text: "Contenu déverrouillé 🔓",
        from: "admin",
        type: "unlocked",
        mediaUrl: data?.mediaUrl,
        mediaType: data?.mediaType || null,
        fileName: data?.fileName || null,
      },
    ]);
    playNotificationSound();
    setMissedCount((c) => c + 1);
});

  socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected:", reason);
  });

  return () => {
    try {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      socket.disconnect();
    } catch (e) {}
    socketRef.current = null;
  };
}, [isIdentified, clientEmail, sellerSlug, historyLoaded]);
  // ===============================
  // REGISTER CLIENT (FIRST ACCESS)
  // ===============================
  const registerClient = async () => {
    if (!emailInput.trim()) return;

    try {
      const cleanEmail = emailInput.trim().toLowerCase();

      const res = await fetch(`${BRIDGE_URL}/pwa/register-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          sellerSlug,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        const newTopicId = String(data.topicId);

        setClientEmail(cleanEmail);
        setTopicId(newTopicId);
        setIsNewClient(Boolean(data.isNew));
        setIsIdentified(true);
        setHistoryLoaded(false);
        setMessages([]);

        localStorage.setItem("pwa_client_email", cleanEmail);
        localStorage.setItem("pwa_topic_id", newTopicId);
        localStorage.setItem("pwa_is_new", data.isNew ? "true" : "false");
      }
    } catch (err) {
      console.error("❌ registerClient error:", err);
    }
  };

  // ===============================
  // LOAD HISTORY
  // ===============================
  const loadHistory = async () => {
  if (!clientEmail || !topicId) return;

  try {
    const url = `${BRIDGE_URL}/pwa/history?email=${encodeURIComponent(
      clientEmail
    )}&sellerSlug=${encodeURIComponent(
      sellerSlug
    )}&topicId=${encodeURIComponent(topicId)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data?.success) {
      setMessages(data.history || []);
      setHistoryLoaded(true);

      // reset du compteur UNIQUEMENT quand l’utilisateur charge l’historique
      setMissedCount(0);
    }
  } catch (err) {
    console.error("❌ loadHistory error:", err);
  }
};

// ===============================
// LOAD PURCHASES (RECOVERY AFTER PAYMENT)
// ===============================
const loadPurchasedContent = async () => {
  if (!clientEmail) return;

  try {
    const url = `${BRIDGE_URL}/pwa/purchases?email=${encodeURIComponent(
      clientEmail
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data?.success && Array.isArray(data.purchases)) {
      for (const p of data.purchases) {
        try {
          const contentRes = await fetch(
            `${BRIDGE_URL}/pwa/content?contentId=${encodeURIComponent(
              p.content_id
            )}`
          );
          const contentData = await contentRes.json();

          if (contentData?.success && contentData.media?.mediaUrl) {
            setMessages((prev) => [
              ...prev,
              {
                text: "Contenu déverrouillé 🔓",
                from: "admin",
                type: "unlocked",
                mediaUrl: contentData.media.mediaUrl,
              },
            ]);
          }
        } catch (e) {
          console.error("❌ Error fetching media for content:", p.content_id, e);
        }
      }
    }
  } catch (err) {
    console.error("❌ loadPurchasedContent error:", err);
  }
};
  // ===============================
  // LOAD PAYMENTS
  // ===============================
  const loadPayments = async () => {
    if (!clientEmail) return;

    try {
      setPaymentsLoading(true);
      setPaymentsError("");

      const url = `${BRIDGE_URL}/pwa/payments?email=${encodeURIComponent(
        clientEmail
      )}&sellerSlug=${encodeURIComponent(sellerSlug)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data?.success) {
        setPaymentsPending(data.pending || []);
        setPaymentsPaid(data.paid || []);
        setShowPayments(true);
      } else {
        setPaymentsError("Erreur chargement paiements");
      }
    } catch (err) {
      console.error("❌ loadPayments error:", err);
      setPaymentsError("Erreur serveur");
    } finally {
      setPaymentsLoading(false);
    }
  };
  // ===============================
  // NOTES (ADMIN MODE ONLY)
  // ===============================
  const fetchAdminNote = async () => {
    if (!isAdminMode || !topicId) return;
    try {
      const r = await fetch(
        `${BRIDGE_URL}/api/pwa/note?seller_slug=${encodeURIComponent(
          sellerSlug
        )}&topic_id=${encodeURIComponent(topicId)}`
      );
      const data = await r.json();
      setAdminNote(data?.note || "");
    } catch (err) {
      console.error("❌ fetchAdminNote error:", err);
    }
  };

  const saveAdminNote = async () => {
    if (!isAdminMode || !topicId) return;

    setIsSavingNote(true);
    try {
      const r = await fetch(`${BRIDGE_URL}/api/pwa/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_slug: sellerSlug,
          topic_id: topicId,
          note: adminNote || "",
        }),
      });

      const data = await r.json();
      if (!r.ok) {
        throw new Error(data?.error || "save_failed");
      }
    } catch (err) {
      console.error("❌ saveAdminNote error:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    // Load note whenever topic changes (admin mode)
    fetchAdminNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, isAdminMode]);

// ===============================
// SEND MESSAGE
// ===============================

const sendMessage = () => {
  const text = inputRef.current?.value?.trim();
  if (!text) return;
  setShowServices(false);

  setMessages((prev) => [...prev, { text, from: "client", type: "text" }]);

  const socket = socketRef.current;
  if (socket && socket.connected) {
    socket.emit("client_message", { text });
  }

  if (inputRef.current) inputRef.current.value = "";
};

const handleKeyDown = (e) => {
  if (e.key === "Enter") sendMessage();
};

if (isCheckingStorage) return null;
const openServices = () => {
  setShowServices(true);
  };
return (
  
  <div className="app">
  <header className="header">

    <div className="header-left">

      <div className="avatar">
        <img src={`/sellers/${sellerSlug}/avatar.jpg`} alt="Professionnel" />
      </div>

      <div className="header-info">

        <div className="pro-name">
          {sellerConfig?.name || "Professionnel"}
        </div>

        <div className="pro-status" style={{ position: "relative" }}>
          Disponible pour vous répondre

          {missedCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -8,
                right: -30,
                background: "#ff3b3b",
                color: "white",
                borderRadius: "50%",
                padding: "4px 8px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {missedCount}
            </span>
          )}
        </div>

        <div className="services-link-header" onClick={openServices}>
          Voir prestations & services
        </div>

        <div className="powered-by">
          Propulsé par NovaPulse
        </div>

      </div>
      <div className="header-right">

        {sellerConfig?.calendly && (
          <button
            className="call-btn"
            onClick={() =>
              window.open(
                `${sellerConfig.calendly}?email=${encodeURIComponent(clientEmail || "")}`,
                "_blank"
              )
            }
          >
            📞 Réserver un appel
          </button>
        )}

        {!isPWAInstalled && (
          <button
            className="install-btn"
            onClick={() => setShowInstallVideo(true)}
          >
            Installer l'app
            <span className="install-badge">⚡ Pour mobile</span>
          </button>
        )}
        </div>

      </div>

  </header>
    {isIdentified && topicId && (
  <div className="client-actions">

    <button
      className="client-action-button"
      onClick={loadHistory}
    >
      📜 Historique des échanges
    </button>

    <button
      className="client-action-button"
      onClick={loadPayments}
    >
      💳 Paiements & facturation
    </button>
  </div>
)}
    
    {/* Admin note panel (only visible with ?admin=1) */}
    {isIdentified && topicId && isAdminMode && (
      <div style={{ padding: "10px" }}>
        <div
          style={{
            borderRadius: 12,
            padding: 12,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            📝 Note admin (liée à cette conversation)
          </div>

          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Écris une note liée à ce topic..."
            rows={4}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 10,
              padding: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              className="history-button"
              onClick={saveAdminNote}
              disabled={isSavingNote}
            >
              {isSavingNote ? "Enregistrement..." : "Enregistrer la note"}
            </button>
          </div>
        </div>
      </div>
    )}

    <main className="chat-area">
      <div className="messages">
        {isIdentified &&
          isNewClient &&
          messages.length === 0 &&
          !showServices && (
            <div className="intro-block">
              <h3>Bonjour et bienvenue chez NovaPulse 👋</h3>

              <video
                src={`/sellers/${sellerSlug}/intro.mp4`}
                controls
                playsInline
                className="intro-video"
              />

              <button
                className="services-button"
                onClick={() => setShowServices(true)}
              >
                📋 Voir les services et prestations
              </button>
            </div>
          )}

        {isIdentified && showServices && (
          <div className="services-block">
            <h3>Nos services et prestations</h3>
            <ul>
              {sellerConfig?.services?.map((service, index) => (
                <li key={index}>🔹 {service}</li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-row ${
              msg.from === "client" ? "row-client" : "row-admin"
            }`}
          >
            <div
              className={`message-bubble ${
                msg.from === "client" ? "bubble-client" : "bubble-admin"
              }`}
            >
              {msg.type === "locked" ? (
                <div className="locked-content">
                  <img src={blurImg} alt="blur" className="blur-image" />
                  <p className="locked-text">🔒 {msg.text}</p>

                  {msg.checkout_url ? (
                    <a
                      href={msg.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pay-button"
                    >
                      💳 Déverrouiller ({(Number(msg.amount) / 100).toFixed(2)}€)
                    </a>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Lien de paiement indisponible
                    </div>
                  )}
                </div>
              ) : msg.type === "simple_payment" ? (
                <div className="locked-content">
                  <p className="locked-text">{msg.text}</p>

                  {msg.checkout_url ? (
                    <a
                      href={msg.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pay-button"
                    >
                      Payer {(Number(msg.amount) / 100).toFixed(2)}€
                    </a>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Lien de paiement indisponible
                    </div>
                  )}
                </div>
              ) : msg.type === "unlocked" ? (
                <div className="unlocked-content">
                  <p className="locked-text">{msg.text}</p>

                  {msg.mediaType === "video" ? (
                    <video
                      src={msg.mediaUrl}
                      controls
                      className="unlocked-image"
                    />
                  ) : msg.mediaType === "document" ? (
                    <a
                      href={`${BRIDGE_URL}/pwa/download?url=${encodeURIComponent(
                        msg.mediaUrl
                      )}&name=${encodeURIComponent(msg.fileName || "document.pdf")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📄 Télécharger le document
                    </a>
                  ) : msg.mediaUrl ? (
                    <img
                      src={msg.mediaUrl}
                      alt="media"
                      className="unlocked-image"
                    />
                  ) : null}
                </div>
              ) : msg.type === "media" ? (
                <div className="media-content">
                  {msg.text && (
                    <p className="locked-text" style={{ marginBottom: 8 }}>
                      {msg.text}
                    </p>
                  )}

                  {msg.mediaType === "photo" && (
                    <img
                      src={msg.url}
                      alt="photo"
                      className="unlocked-image"
                    />
                  )}

                  {msg.mediaType === "video" && (
                    <video
                      src={msg.url}
                      controls
                      className="unlocked-image"
                    />
                  )}

                  {(
                  
                    msg.mediaType === "document" ||
                    msg.url?.toLowerCase().includes(".pdf") ||
                    msg.fileName?.toLowerCase().includes(".pdf")
                    
                  ) && (
                    <a
                      href={getDownloadUrl(msg.url, msg.fileName, "document")}
                      download={msg.fileName || "document.pdf"}
                    >
                      📄 Télécharger le document : {msg.fileName || ""}
                    </a>
                  )}
                </div>
              ) : (
                msg.from === "admin"
                  ? maskEnvCommand(msg.text)
                  : msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </main>
{showPayments && (
  <div style={{ padding: 10 }}>
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 12,
        border: "1px solid #eee",
      }}
    >
      <h3>💳 Paiements en attente</h3>

      {paymentsLoading && <p>Chargement...</p>}
      {paymentsError && <p style={{ color: "red" }}>{paymentsError}</p>}

      {paymentsPending.length === 0 && !paymentsLoading && (
        <p>Aucun paiement en attente</p>
      )}

      {paymentsPending.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        >
          <strong>{p.caption || "Paiement"}</strong>
          <div>Montant : {p.amount_eur} €</div>
          <div>Date envoi : {p.sent_at || "-"}</div>

          {p.payment_link_url && (
            <a
              href={p.payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pay-button"
            >
              💳 Payer maintenant
            </a>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>✅ Paiements déjà payés</h3>

      {paymentsPaid.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
            opacity: 0.7,
          }}
        >
          <strong>{p.caption || "Paiement"}</strong>
          <div>Montant : {p.amount_eur} €</div>
          <div>Payé le : {p.paid_at || "-"}</div>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button className="history-button" onClick={() => setShowPayments(false)}>
          Fermer
        </button>
      </div>
    </div>
  </div>
)}
    <footer className="input-bar">
      <div className="composer">
        {/* Input file caché */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleClientMedia}

        />
        {/* Bouton + */}
        <button
          className="plus-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isIdentified}

        >
          +

        </button>
        <input
          ref={inputRef}
          className="input"
          placeholder="Écrivez votre message..."
          disabled={!isIdentified}
          onKeyDown={handleKeyDown}
        />

        <button
          className="send-button"
          onClick={sendMessage}
          disabled={!isIdentified}
        >
          <img src={sendIcon} alt="Envoyer" className="send-img" />
        </button>
      </div>

      <div className="payment-note">
        🔒 NovaPulse utilise Stripe pour des paiements 100% sécurisés
      </div>
    </footer>

    {!isIdentified && (
      <div className="modal-overlay">
        <div className="modal-box">
          <h2>Accès à votre espace privé</h2>
          <p>
            Entrez votre email pour accéder à votre espace de suivi personnalisé et confidentiel avec votre professionnel.
          </p>

          <input
            type="email"
            placeholder="votre@email.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="input"
          />

                    <button className="send-button" onClick={registerClient}>
            Accéder au chat
          </button>
          <p className="secure-note">
            🔒 Données et paiements protégés — accès strictement confidentiel
          </p>
        </div>
      </div>
    )}
    {showInstallVideo && (
  <div
    className="modal-overlay"
    onClick={() => setShowInstallVideo(false)}
  >
    <div
      className="modal-box"
      onClick={(e) => e.stopPropagation()}
    >

      <h2>Installer NovaPulse</h2>

      <p>
        1️⃣ Ouvrez le menu de votre navigateur  
      <br/>
        2️⃣ Cliquez sur "Partager"
      <br/>
        3️⃣ Cliquez sur "Ajouter à l'écran d'accueil"
      </p>

      <video
        src={installVideo}
        controls
        playsInline
        onEnded={() => setShowInstallVideo(false)}
        style={{ width: "100%", borderRadius: "12px", marginTop: "10px"}}
      />
    </div>
  </div>
)}
  </div>
);
}


export default App;