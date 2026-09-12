import "./App.css";
import sendIcon from "./assets/send.png";
import blurImg from "./assets/blur.png";
import installVideo from "./assets/install_pwa.mp4";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";








const BRIDGE_URL = "https://mini-jessie-bot-1.onrender.com";

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
  const isValidated = sellerConfig?.meta?.validated === true;
  const [isNewClient, setIsNewClient] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);
  const [purchasedLoading, setPurchasedLoading] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [purchasedError, setPurchasedError] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentsPending, setPaymentsPending] = useState([]);
  const [paymentsPaid, setPaymentsPaid] = useState([]);
  const [sellerPaidCount, setSellerPaidCount] = useState(0);
  const notificationSoundRef = useRef(null);
  const [showInstallVideo, setShowInstallVideo] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [clientType, setClientType] = useState(null); // "particulier" ou "entreprise"
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [siret, setSiret] = useState("");
  const [tva, setTva] = useState("");
  const [electronicBillingAddress, setElectronicBillingAddress] = useState("");
  const [showFullForm, setShowFullForm] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [isSendingReview, setIsSendingReview] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [quoteModal, setQuoteModal] = useState(null);
  const [quoteSignerName, setQuoteSignerName] = useState("");
  const [quoteConsent, setQuoteConsent] = useState(false);
  const [showLoginCode, setShowLoginCode] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [showActivationIntro, setShowActivationIntro] = useState(false);
  const [openActivationStep, setOpenActivationStep] = useState(null);
  const [activationScreen, setActivationScreen] = useState("intro");
  const [telegramActivationConsent, setTelegramActivationConsent] = useState(false);
  const [sellerLogo, setSellerLogo] = useState(null);
  const [sellerIntroVideo, setSellerIntroVideo] = useState(null);
  const [sellerWelcomeVideo, setSellerWelcomeVideo] = useState(null);
  const [sellerLogoError, setSellerLogoError] = useState("");
  const [sellerIntroVideoError, setSellerIntroVideoError] = useState("");
  const [sellerWelcomeVideoError, setSellerWelcomeVideoError] = useState("");
  const [sellerLogoWarning, setSellerLogoWarning] = useState("");
  const sellerMediaRequests = useRef({ logo: 0, intro: 0, welcome: 0 });
  const sellerMediaValid = Boolean(sellerLogo && sellerIntroVideo && sellerWelcomeVideo);

  function readSellerMediaMetadata(file, isImage) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const media = isImage ? new Image() : document.createElement("video");
      const cleanup = () => {
        clearTimeout(timeout);
        media.onload = media.onloadedmetadata = media.onerror = null;
        media.removeAttribute("src");
        if (!isImage) media.load();
        URL.revokeObjectURL(url);
      };
      const fail = () => {
        cleanup();
        reject(new Error("Fichier illisible ou métadonnées indisponibles."));
      };
      const timeout = setTimeout(fail, 15000);
      const loaded = () => {
        const metadata = isImage
          ? { width: media.naturalWidth, height: media.naturalHeight }
          : { width: media.videoWidth, height: media.videoHeight, duration: media.duration };
        cleanup();
        resolve(metadata);
      };
      media.onerror = fail;
      if (isImage) media.onload = loaded;
      else {
        media.preload = "metadata";
        media.onloadedmetadata = loaded;
      }
      media.src = url;
    });
  }

  async function validateSellerMedia(event, kind, setFile, setError) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const request = ++sellerMediaRequests.current[kind];
    const isImage = kind === "logo";
    setFile(null);
    setError("");
    if (isImage) setSellerLogoWarning("");
    if (!file) return;
    try {
      const extension = file.name.split(".").pop().toLowerCase();
      const formats = isImage
        ? { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }
        : { mp4: "video/mp4" };
      if (!Object.hasOwn(formats, extension) || (file.type && file.type !== formats[extension])) {
        throw new Error(isImage ? "Formats autorisés : PNG, JPG, JPEG ou WebP." : "Format autorisé : MP4 uniquement.");
      }
      const maxMo = isImage ? 2 : 50;
      if (!file.size || file.size > maxMo * 1024 * 1024) {
        throw new Error("Le fichier doit être non vide et ne pas dépasser " + maxMo + " Mo.");
      }
      const { width, height, duration } = await readSellerMediaMetadata(file, isImage);
      if (isImage) {
        if (width < 512 || height < 512) throw new Error("Dimensions minimales : 512 × 512 px.");
      } else {
        const welcome = kind === "welcome";
        if (!Number.isFinite(duration) || duration <= 0 || duration > 60 || (welcome && duration < 30)) {
          throw new Error(welcome ? "La vidéo doit durer entre 30 et 60 secondes." : "La vidéo doit durer au maximum 60 secondes et avoir une durée positive.");
        }
        if (width !== (welcome ? 1080 : 1920) || height !== (welcome ? 1920 : 1080)) {
          throw new Error(welcome ? "Dimensions requises : 1080 × 1920 px, ratio 9:16 vertical." : "Dimensions requises : 1920 × 1080 px, ratio 16:9.");
        }
      }
      if (request !== sellerMediaRequests.current[kind]) return;
      if (isImage && width !== height) setSellerLogoWarning("Image non carrée : un format carré est recommandé.");
      setFile(file);
    } catch (error) {
      if (request !== sellerMediaRequests.current[kind]) return;
      input.value = "";
      setError(error.message || "Impossible de valider ce fichier.");
    }
  }

  function handleSellerLogoChange(event) {
    return validateSellerMedia(event, "logo", setSellerLogo, setSellerLogoError);
  }

  function handleSellerIntroVideoChange(event) {
    return validateSellerMedia(event, "intro", setSellerIntroVideo, setSellerIntroVideoError);
  }

  function handleSellerWelcomeVideoChange(event) {
    return validateSellerMedia(event, "welcome", setSellerWelcomeVideo, setSellerWelcomeVideoError);
  }





  const [sellerForm, setSellerForm] = useState({
    company_name: "",
    legal_name: "",
    legal_status: "",
    siren: "",
    siret: "",
    address: "",
    postal_code: "",
    city: "",
    country: "FR",
    email: "",
    phone: "",
    vat_status: "",
    vat_number: "",
    default_vat_rate: "",
  });
  
    
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
const renderTextWithLinks = (text) => {
  if (!text) return "";

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
};
const checkClientAndContinue = async () => {
  if (!emailInput.trim()) return;

if (!isValidEmail(emailInput)) {
  alert("Veuillez entrer une adresse email valide.");
  return;
}

  try {
    const res = await fetch(`${BRIDGE_URL}/pwa/check-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailInput.trim().toLowerCase(),
        sellerSlug,
      }),
    });

    const data = await res.json();

    // 👉 CLIENT EXISTANT
    if (data.exists && data.requiresVerification) {
      console.log("🔐 Client existant → vérification requise");

      const codeRes = await fetch(`${BRIDGE_URL}/pwa/request-login-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          sellerSlug,
        }),
      });

      const codeData = await codeRes.json();

      if (!codeRes.ok || !codeData.success) {
        alert("Impossible d’envoyer le code de connexion.");
        return;
      }

      setShowLoginCode(true);
      setIsIdentified(false);
      setIsNewClient(false);

      return;
    }

    // 👉 NOUVEAU CLIENT → afficher formulaire
    console.log("🆕 Nouveau client");
    setShowFullForm(true);

  } catch (err) {
    console.error("❌ checkClient error:", err);
  }
};
  const verifyLoginCode = async () => {
  const code = loginCode.trim();

  if (!/^\d{6}$/.test(code)) {
    alert("Veuillez entrer le code à 6 chiffres.");
    return;
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/pwa/verify-login-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailInput.trim().toLowerCase(),
        sellerSlug,
        code,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.verified) {
      alert("Code invalide ou expiré.");
      return;
    }

    const client = data.clientData || {};
    const cleanEmail = emailInput.trim().toLowerCase();

    setClientEmail(cleanEmail);
    setIsIdentified(true);
    setIsNewClient(false);
    setShowLoginCode(false);

    if (client.topic_id) {
      setTopicId(String(client.topic_id));

      localStorage.setItem("pwa_client_email", cleanEmail);
      localStorage.setItem("pwa_topic_id", String(client.topic_id));
      localStorage.setItem("pwa_is_new", "false");
      localStorage.setItem("pwa_seller_slug", sellerSlug);
    }

    console.log("✅ Reconnexion PWA vérifiée");

  } catch (err) {
    console.error("❌ verifyLoginCode error:", err);
    alert("Erreur lors de la vérification du code.");
  }
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
        createdTime: new Date().toISOString()
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
  loadReviews();
}, [sellerSlug]);

useEffect(() => {
  const fetchSellerStats = async () => {
    try {
      const res = await fetch(
        `${BRIDGE_URL}/pwa/seller-stats?sellerSlug=${encodeURIComponent(sellerSlug)}`
      );
      const data = await res.json();

      if (data?.success) {
        setSellerPaidCount(data.totalPaid || 0);
      }
    } catch (err) {
      console.error("❌ seller stats fetch error:", err);
    }
  };

  if (sellerSlug) {
    fetchSellerStats();
  }
}, [sellerSlug]);

useEffect(() => {
  const checkAdminStatus = async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/admin-status`);
      const data = await res.json();
      setAdminOnline(data.online);
    } catch (err) {
      console.error("❌ admin status error:", err);
    }
  };

  checkAdminStatus();

  const interval = setInterval(checkAdminStatus, 30000);

  return () => clearInterval(interval);
}, []);
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

  // ✅ récupère le nombre de messages manqués
  const n = await loadMissedCount();

  await loadHistory();
  await loadMissedCount();

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
  setMessages((prev) => [...prev, { text, from: "admin", type: "text", createdTime: new Date().toISOString()}]);
  playNotificationSound();
  setMissedCount((c) => c + 1);
});

  socket.on("admin_media", (data) => {
  const type = data?.type;
  const url = data?.url;
  const fileName = data?.fileName;
  const text = data?.text ?? "";

  // 📄 Informations spécifiques aux devis
  const quoteId = data?.quoteId || null;
  const isQuote = data?.isQuote === true;

  setMessages((prev) => [
    ...prev,
    {
      from: "admin",
      type: "media",
      mediaType: type,
      url,
      fileName,
      text,
      quoteId,
      isQuote,
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

const loadPurchasedGallery = async () => {
  if (!clientEmail) return;

  try {
    setPurchasedLoading(true);
    setPurchasedError("");
    setPurchasedItems([]);

    const url = `${BRIDGE_URL}/pwa/purchases?email=${encodeURIComponent(
      clientEmail
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data?.success || !Array.isArray(data.purchases)) {
      setPurchasedError("Impossible de charger les contenus achetés.");
      setShowPurchased(true);
      return;
    }

    const enrichedPurchases = [];

    for (const p of data.purchases) {
      const contentRes = await fetch(
        `${BRIDGE_URL}/pwa/content?contentId=${encodeURIComponent(
          p.content_id
        )}`
      );

      const contentData = await contentRes.json();

      if (contentData?.success && contentData.media?.mediaUrl) {
        enrichedPurchases.push({
          ...p,
          mediaUrl: contentData.media.mediaUrl,
          mediaType: contentData.media.mediaType || "photo",
          fileName: contentData.media.fileName || "contenu",
        });
      }
    }

    setPurchasedItems(enrichedPurchases);
    setShowPurchased(true);
  } catch (err) {
    console.error("❌ loadPurchasedGallery error:", err);
    setPurchasedError("Erreur serveur lors du chargement des contenus.");
    setShowPurchased(true);
  } finally {
    setPurchasedLoading(false);
  }
};
  // ===============================
  // REGISTER CLIENT (FIRST ACCESS)
  // ===============================
  const registerClient = async () => {
    if (!emailInput.trim()) return;
    if (!isValidEmail(emailInput)) {
  alert("Veuillez entrer une adresse email valide.");
  return;
}

    if (!clientType) {
      alert("Veuillez choisir votre statut");
      return;
    }

    if (clientType === "entreprise") {
      if (!entrepriseNom || !siret) {
        alert("Veuillez remplir toutes les informations entreprise");
        return;
    }
  }
    try {
      const cleanEmail = emailInput.trim().toLowerCase();

      const res = await fetch(`${BRIDGE_URL}/pwa/register-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          sellerSlug,
          type_client: clientType,
          entreprise_nom: clientType === "entreprise" ? entrepriseNom : "",
          siret: clientType === "entreprise" ? siret : "",
          tva: clientType === "entreprise" ? tva : "",
          electronic_billing_address:
            clientType === "entreprise" ? electronicBillingAddress : "",
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
        localStorage.setItem("pwa_seller_slug", sellerSlug);
      }
    } catch (err) {
      console.error("❌ registerClient error:", err);
    }
  };
    if (window.subscribePush) {
  console.log("🔔 Tentative subscription push après login");
  window.subscribePush();
}
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

const sendReview = async () => {
  if (!reviewText.trim()) return;

  try {
    setIsSendingReview(true);

    const res = await fetch(`${BRIDGE_URL}/pwa/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sellerSlug,
        email: clientEmail,
        review: reviewText.trim(),
      }),
    });

    const data = await res.json();

    if (data?.success) {
      setReviewText("");
      setShowReviewModal(false);
      alert("Merci pour votre avis !");
    } else {
      alert("Impossible d’envoyer l’avis pour le moment.");
    }
  } catch (err) {
    console.error("❌ sendReview error:", err);
    alert("Erreur serveur lors de l’envoi de l’avis.");
  } finally {
    setIsSendingReview(false);
  }
};

const loadReviews = async () => {
  try {
    const res = await fetch(`${BRIDGE_URL}/pwa/reviews/${sellerSlug}`);
    const data = await res.json();

    if (data?.reviews) {
      setReviews(data.reviews);
    }
  } catch (err) {
    console.error("❌ loadReviews error:", err);
  }
};









// ===============================
// SEND MESSAGE
// ===============================

const sendMessage = () => {
  const text = inputRef.current?.value?.trim();
  if (!text) return;

  setShowServices(false);

  const now = new Date().toISOString();

  setMessages((prev) => {
    const newMessages = [
      ...prev,
      {
        text,
        from: "client",
        type: "text",
        createdTime: now,
      },
    ];

    if (!adminOnline) {
      newMessages.push({
        text: "Salut, je suis actuellement hors ligne, mais j’ai bien reçu ton message, je te répondrai dès que possible. En attendant, tu peux prendre un rdv pour que je t'explique les fonctionnalités ! C'est le bouton en forme de calendrier.",
        from: "admin",
        type: "text",
        createdTime: new Date().toISOString(),
      });
    }

    return newMessages;
  });

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
const formatMessageTime = (dateString) => {
if (!dateString) return "";

const d = new Date(dateString);

const hours = d.getHours().toString().padStart(2, "0");
const minutes = d.getMinutes().toString().padStart(2, "0");

return `${hours}:${minutes}`;
};

const formatMessageDate = (dateString) => {
  if (!dateString) return "";

  const d = new Date(dateString);
  const today = new Date();

  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Aujourd’hui";
  if (isYesterday) return "Hier";

  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long"
  });
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
          <span className={`status-text ${adminOnline ? "online" : "offline"}`}>
            {adminOnline ? "En ligne" : "Hors ligne"}
          </span>

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

      </div>

    </div>  {/* ← FERME header-left ici */}

    <div className="header-right">

      {sellerConfig?.calendly && (
        <button
          className="call-icon-btn"
          onClick={() => setShowCalendly(true)}
        >
          📅
        </button>
      )}

      {sellerConfig?.phone && (
        <a
          href={`tel:${sellerConfig.phone}`}
          className="call-icon-btn"
        >
          📞
        </a>
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

  </header>


    
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
            <div className="intro-block intro-hero">
              <div className="intro-logo">NovaPulse</div>

              <h1>Bienvenue chez NovaPulse 👋</h1>

              <p className="intro-subtitle">
                La plateforme tout-en-un pour gérer vos clients, paiements et relances
                sans quitter vos conversations.
              </p>

              <video
                src={`/sellers/${sellerSlug}/Intro.mp4`}
                controls
                playsInline
                className="intro-video"
              />
            <div className="intro-buttons">
              <button
                className="services-button intro-main-btn"
                onClick={() => setShowServices(true)}
              >
                📋 Voir les services et prestations
              </button>

              {sellerConfig?.calendly && (
                <button
                  className="intro-call-btn"
                  onClick={() => setShowCalendly(true)}
                >
                  📅 Réserver un appel découverte
                </button>
              )}
            </div>

              <div className="intro-secure">
                🔒 Paiements 100% sécurisés avec Stripe
              </div>

              <div className="intro-benefits">
                <div className="intro-card">
                  <div className="intro-icon">⚡</div>
                  <strong>Tout centralisé</strong>
                  <span>Conversations, devis, paiements et documents au même endroit.</span>
                </div>

                <div className="intro-card">
                  <div className="intro-icon">🛡️</div>
                  <strong>Plus de ventes</strong>
                  <span>Ne perdez plus de clients grâce à un suivi fluide.</span>
                </div>

                <div className="intro-card">
                  <div className="intro-icon">⏱️</div>
                  <strong>Gain de temps</strong>
                  <span>Automatisez vos tâches et concentrez-vous sur l’essentiel.</span>
                </div>
              </div>
            </div>
          )}


        {isIdentified && showServices && (
          <div className="services-overlay" onClick={() => setShowServices(false)}>
            
            <div className="services-modal" onClick={(e) => e.stopPropagation()}>

              {/* HEADER */}
              <div className="services-modal-header">
                <h3>Nos services et prestations</h3>
              </div>

              
              {/* SERVICES */}
              <div className="services-table">

                {sellerConfig?.services?.map((service, index) => (
                  <div className="service-row" key={index}>

                    <span className="service-name">
                      {service.name}
                    </span>

                    <span className="service-price">
                      {service.price}
                    </span>

                  </div>
                ))}

              </div>

              {/* PRODUITS DIGITAUX */}
              {sellerConfig?.digitalProducts?.length > 0 && (
                <div className="digital-products-section">

                  <h4 className="digital-title">
                    Produits digitaux
                  </h4>

                  <div className="digital-products-grid">

                    {sellerConfig.digitalProducts.map((product, index) => (
                      <div className="digital-product-card" key={index}>

                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="digital-product-image"
                          />
                        )}

                        <div className="digital-product-content">

                          <div className="digital-product-header">

                            <h5>{product.title}</h5>

                            <span className="digital-product-price">
                              {product.price}
                            </span>

                          </div>

                          <p className="digital-product-description">
                            {product.description}
                          </p>

                          <a
                            href={product.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="digital-product-button"
                          >
                            Acheter maintenant
                          </a>

                        </div>

                      </div>
                    ))}

                  </div>

                </div>
              )}

              {/* VALIDATION EN BAS */}
              {isValidated && (
                <>
                  <div style={{
                    marginTop: 20,
                    paddingTop: 12,
                    borderTop: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 14
                  }}>
                    
                    <span style={{ color: "#16a34a", fontWeight: 500 }}>
                      ✔ Validé par NovaPulse
                    </span>

                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "#f59e0b"
                    }}>
                      <span>⭐</span>
                      <span style={{ fontWeight: 600 }}>5.0</span>
                      {sellerPaidCount > 0 && (
                        <span style={{ color: "#6b7280" }}>
                          ({sellerPaidCount})
                        </span>
                      )}
                    </span>

                  </div>

                  {reviews.length > 0 && (
                    <div
                      style={{
                        marginTop: 18,
                        background: "linear-gradient(135deg, #f5f3ff, #fafafa)",
                        border: "1px solid #ede9fe",
                        borderRadius: 18,
                        padding: 18,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 20 }}>
                            Avis clients vérifiés
                          </h3>
                          <p style={{ marginTop: 4, color: "#6b7280", fontSize: 14 }}>
                            Des clients satisfaits qui partagent leur expérience
                          </p>
                        </div>

                        <div style={{
                          background: "white",
                          border: "1px solid #eee",
                          borderRadius: 14,
                          padding: "10px 14px",
                          fontWeight: 700,
                          color: "#f59e0b"
                        }}>
                          ⭐ 5.0/5
                        </div>
                      </div>

                      {reviews.map((review, index) => (
                        <div
                          key={index}
                          style={{
                            background: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 12,
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            {review.email?.replace(/(.{4}).+(@.+)/, "$1•••$2")}
                            <span style={{
                              marginLeft: 10,
                              fontSize: 12,
                              color: "#6d28d9",
                              background: "#ede9fe",
                              padding: "4px 8px",
                              borderRadius: 999
                            }}>
                              Achat vérifié
                            </span>
                          </div>

                          <div style={{ color: "#f59e0b", marginBottom: 8 }}>
                            ⭐⭐⭐⭐⭐
                          </div>

                          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                            {review.avis}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </>
              )}

            </div>

          </div>
        )}


          {messages.map((msg, index) => {

            const prevMsg = messages[index - 1];

            const showDate =
              !prevMsg ||
              formatMessageDate(prevMsg.createdTime) !== formatMessageDate(msg.createdTime);

            return (
              <div key={index}>

                {showDate && msg.createdTime && (
                  <div className="date-separator">
                    {formatMessageDate(msg.createdTime)}
                  </div>
                )}

                <div
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
                    <>
                      <a
                        href={`${BRIDGE_URL}/pwa/download?url=${encodeURIComponent(
                          msg.url
                        )}&name=${encodeURIComponent(msg.fileName || "apercu.pdf")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📄 Télécharger le document : {msg.fileName || "apercu.pdf"}
                      </a>

                      {msg.isQuote && msg.quoteId && (
                        msg.quoteStatus === "accepted" ? (
                          <div
                            style={{
                              marginTop: 10,
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: "#dcfce7",
                              color: "#166534",
                              fontWeight: 700,
                              textAlign: "center",
                            }}
                          >
                            ✅ Devis accepté
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="pay-button"
                            style={{
                              width: "100%",
                              marginTop: 10,
                            }}
                            onClick={() => {
                              setQuoteModal(msg);
                              setQuoteSignerName("");
                              setQuoteConsent(false);
                            }}
                          >
                            ✅ Accepter et signer le devis
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  {msg.from === "admin"
                    ? renderTextWithLinks(maskEnvCommand(msg.text))
                    : renderTextWithLinks(msg.text)}

                  {msg.from === "admin" && msg.text?.includes("Merci pour votre paiement") && (
                    <button
                      onClick={() => setShowReviewModal(true)}
                      style={{
                        marginTop: 10,
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      ⭐ Laisser un avis
                    </button>
                  )}
                </>
              )}
                {msg.createdTime && (
                  <div className="message-time">
                    {formatMessageTime(msg.createdTime)}
                  </div>
                )}
              </div>
            </div>

          </div>
        );
      })}
        <div ref={messagesEndRef} />
      </div>
    </main>
{showPayments && (
  <div
    className="modal-overlay"
    onClick={() => setShowPayments(false)}
  >
    <div
      className="modal-box"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: "500px", width: "95%" }}
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
      {paymentsPaid.length === 0 && !paymentsLoading && (
        <p>Aucun paiement déjà payé</p>
      )}

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
  {showPurchased && (
  <div
    className="modal-overlay"
    onClick={() => setShowPurchased(false)}
  >
    <div
      className="modal-box"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: "700px", width: "95%" }}
    >
      <h3>📁 Contenus achetés</h3>

      {purchasedLoading && <p>Chargement...</p>}

      {purchasedError && (
        <p style={{ color: "red" }}>{purchasedError}</p>
      )}

      {!purchasedLoading && purchasedItems.length === 0 && (
        <p>Aucun contenu acheté.</p>
      )}

      <div
        style={{
          display: "grid",
          gap: 16,
          marginTop: 20,
        }}
      >
        {purchasedItems.map((item, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background:
                  item.mediaType === "video"
                    ? "#fee2e2"
                    : item.mediaType === "document"
                    ? "#dbeafe"
                    : "#dcfce7",
                color:
                  item.mediaType === "video"
                    ? "#b91c1c"
                    : item.mediaType === "document"
                    ? "#1d4ed8"
                    : "#15803d",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {item.mediaType === "video" && "🎥 Vidéo"}
              {item.mediaType === "document" && "📄 Document"}
              {item.mediaType === "photo" && "🖼️ Image"}
            </div>

            <div
              style={{
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Achat du{" "}
            
              {item.paid_at
                ? new Date(item.paid_at).toLocaleDateString("fr-FR")
                : "-"}
            </div>

            <div style={{ marginBottom: 10 }}>
              💳 {(item.amount_cents / 100).toFixed(2)} €
            </div>

            {item.mediaType === "photo" && (
              <img
                src={item.mediaUrl}
                alt="contenu"
                onClick={() => window.open(item.mediaUrl, "_blank")}
                style={{
                  width: "100%",
                  maxHeight: 320,
                  objectFit: "cover",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              />
            )}

            {item.mediaType === "video" && (
              <video
                src={item.mediaUrl}
                controls
                style={{
                  width: "100%",
                  maxHeight: 320,
                  objectFit: "cover",
                  borderRadius: 12,
                }}
              />
            )}

            {item.mediaType === "document" && (
              <a
                href={`${BRIDGE_URL}/pwa/download?url=${encodeURIComponent(
                  item.mediaUrl
                )}&name=${encodeURIComponent(item.fileName || "document.pdf")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pay-button"
              >
                📄 Télécharger le document
              </a>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button
          className="history-button"
          onClick={() => setShowPurchased(false)}
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
)}






{showActivationIntro && (
  <div
    className="modal-overlay"
    onClick={() => {
      setShowActivationIntro(false);
      setActivationScreen("intro");
      setTelegramActivationConsent(false);
    }}
  >
    <div
      className="modal-box"
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: "540px",
        width: "92%",
        textAlign: "left",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
    >

      {/* ========================= */}
      {/* ÉCRAN 1 : INTRODUCTION */}
      {/* ========================= */}

      {activationScreen === "intro" && (
        <>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                fontSize: 36,
                marginBottom: 10,
              }}
            >
              ⚡
            </div>

            <h2 style={{ marginBottom: 8 }}>
              Activez votre NovaPulse
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Configurez votre espace professionnel pour commencer à vendre,
              envoyer vos devis et gérer vos paiements directement depuis vos
              conversations.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 22,
            }}
          >

            {/* ÉTAPE 1 */}

            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                onClick={() =>
                  setOpenActivationStep(
                    openActivationStep === 1 ? null : 1
                  )
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <strong>1. Vos informations professionnelles</strong>

                <span
                  style={{
                    fontSize: 18,
                    transform:
                      openActivationStep === 1
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    transition: "0.2s",
                  }}
                >
                  ⌄
                </span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginTop: 5,
                }}
              >
                Préparez les informations nécessaires à la création de votre espace.
              </div>

              {openActivationStep === 1 && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #e5e7eb",
                    fontSize: 13,
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  • Nom commercial
                  <br />• Raison sociale
                  <br />• Statut juridique
                  <br />• SIREN
                  <br />• SIRET
                  <br />• Adresse complète
                  <br />• Code postal
                  <br />• Ville
                  <br />• Pays
                  <br />• Email professionnel
                  <br />• Numéro de téléphone
                  <br />• Situation vis-à-vis de la TVA
                  <br />• Numéro de TVA intracommunautaire si applicable
                  <br />• Taux de TVA habituel
                </div>
              )}
            </div>

            {/* ÉTAPE 2 */}

            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                onClick={() =>
                  setOpenActivationStep(
                    openActivationStep === 2 ? null : 2
                  )
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <strong>2. Votre identité NovaPulse</strong>

                <span
                  style={{
                    fontSize: 18,
                    transform:
                      openActivationStep === 2
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    transition: "0.2s",
                  }}
                >
                  ⌄
                </span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginTop: 5,
                }}
              >
                Préparez votre logo et vos vidéos de présentation.
              </div>

              {openActivationStep === 2 && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #e5e7eb",
                    fontSize: 13,
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>🖼️ Logo ou photo professionnelle</strong>
                  <br />
                  512 × 512 px minimum
                  <br />
                  PNG, JPG ou WebP
                  <br />
                  2 Mo maximum
                  <br />
                  Logo ou visage bien centré.

                  <br />
                  <br />

                  <strong>🎥 Vidéo de présentation</strong>
                  <br />
                  1920 × 1080 px — 16:9
                  <br />
                  MP4
                  <br />
                  60 secondes maximum
                  <br />
                  50 Mo maximum

                  <br />
                  <br />

                  <strong>📱 Vidéo d’accueil</strong>
                  <br />
                  1080 × 1920 px — 9:16
                  <br />
                  MP4
                  <br />
                  30 à 60 secondes
                  <br />
                  50 Mo maximum
                </div>
              )}
            </div>

            {/* ÉTAPE 3 */}

            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                onClick={() =>
                  setOpenActivationStep(
                    openActivationStep === 3 ? null : 3
                  )
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <strong>3. Activation avec NovaPulse</strong>

                <span
                  style={{
                    fontSize: 18,
                    transform:
                      openActivationStep === 3
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    transition: "0.2s",
                  }}
                >
                  ⌄
                </span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginTop: 5,
                }}
              >
                Réservez votre appel pour finaliser votre installation.
              </div>

              {openActivationStep === 3 && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #e5e7eb",
                    fontSize: 13,
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  Une fois vos informations et vos médias envoyés, vous pourrez
                  réserver votre appel d’activation.

                  <br />
                  <br />

                  Pendant cet appel, NovaPulse vous accompagnera dans la
                  configuration de Telegram, la création du supergroupe et le
                  branchement de votre espace.

                  <br />
                  <br />

                  Vous restez présent pendant toute la configuration.
                  Aucun mot de passe ni code de sécurité Telegram ne sera conservé.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActivationScreen("company")}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "white",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            C’est parti →
          </button>
        </>
      )}

      {/* ========================= */}
      {/* ÉCRAN 2 : ENTREPRISE */}
      {/* ========================= */}

      {activationScreen === "company" && (
        <>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>
              🏢
            </div>

            <h2 style={{ marginBottom: 8 }}>
              Vos informations professionnelles
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Renseignez les informations utilisées pour votre espace,
              vos devis et votre facturation.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <input
              className="input"
              placeholder="Nom commercial"
              value={sellerForm.company_name}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  company_name: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Raison sociale"
              value={sellerForm.legal_name}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  legal_name: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Statut juridique"
              value={sellerForm.legal_status}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  legal_status: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="SIREN"
              value={sellerForm.siren}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  siren: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="SIRET"
              value={sellerForm.siret}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  siret: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Adresse"
              value={sellerForm.address}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  address: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Code postal"
              value={sellerForm.postal_code}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  postal_code: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Ville"
              value={sellerForm.city}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  city: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Pays"
              value={sellerForm.country}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  country: e.target.value,
                })
              }
            />

            <input
              className="input"
              type="email"
              placeholder="Email professionnel"
              value={sellerForm.email}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  email: e.target.value,
                })
              }
            />

            <input
              className="input"
              placeholder="Téléphone"
              value={sellerForm.phone}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  phone: e.target.value,
                })
              }
            />

            <select
              className="input"
              value={sellerForm.vat_status}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  vat_status: e.target.value,
                })
              }
            >
              <option value="">Situation TVA</option>
              <option value="franchise_base">
                Franchise en base de TVA
              </option>
              <option value="vat_registered">
                Assujetti à la TVA
              </option>
            </select>

            <input
              className="input"
              placeholder="Numéro TVA intracommunautaire"
              value={sellerForm.vat_number}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  vat_number: e.target.value,
                })
              }
            />

            <input
              className="input"
              type="number"
              placeholder="Taux de TVA habituel (%)"
              value={sellerForm.default_vat_rate}
              onChange={(e) =>
                setSellerForm({
                  ...sellerForm,
                  default_vat_rate: e.target.value,
                })
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              onClick={() => setActivationScreen("intro")}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Retour
            </button>

            <button
              onClick={() => setActivationScreen("media")}
              style={{
                flex: 2,
                height: 46,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Continuer →
            </button>
          </div>
        </>
      )}

{activationScreen === "media" && (
  <>
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>
        🎨
      </div>

      <h2 style={{ marginBottom: 8 }}>
        Votre identité NovaPulse
      </h2>

      <p
        style={{
          margin: 0,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        Ajoutez les éléments qui personnaliseront votre espace NovaPulse.
      </p>
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >

      {/* LOGO */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 16,
          background: "#f8fafc",
        }}
      >
        <strong>🖼️ Logo ou photo professionnelle</strong>

        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.5,
            marginTop: 5,
            marginBottom: 12,
          }}
        >
          512 × 512 px minimum · PNG, JPG ou WebP · 2 Mo maximum
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleSellerLogoChange}
        />

        {sellerLogoError && (
          <div role="alert" style={{ marginTop: 10, fontSize: 13, color: "#dc2626" }}>
            {sellerLogoError}
          </div>
        )}

        {sellerLogoWarning && (
          <div role="status" style={{ marginTop: 10, fontSize: 13, color: "#b45309" }}>
            {sellerLogoWarning}
          </div>
        )}

        {sellerLogo && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            ✓ {sellerLogo.name}
          </div>
        )}
      </div>


      {/* VIDEO PRESENTATION */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 16,
          background: "#f8fafc",
        }}
      >
        <strong>🎥 Vidéo de présentation</strong>

        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.5,
            marginTop: 5,
            marginBottom: 12,
          }}
        >
          1920 × 1080 px · 16:9 · MP4
          <br />
          60 secondes maximum · 50 Mo maximum
        </div>

        <input
          type="file"
          accept="video/mp4"
          onChange={handleSellerIntroVideoChange}
        />

        {sellerIntroVideoError && (
          <div role="alert" style={{ marginTop: 10, fontSize: 13, color: "#dc2626" }}>
            {sellerIntroVideoError}
          </div>
        )}

        {sellerIntroVideo && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            ✓ {sellerIntroVideo.name}
          </div>
        )}
      </div>


      {/* VIDEO ACCUEIL */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 16,
          background: "#f8fafc",
        }}
      >
        <strong>📱 Vidéo d’accueil</strong>

        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.5,
            marginTop: 5,
            marginBottom: 12,
          }}
        >
          Vertical 1080 × 1920 px · 9:16 · MP4
          <br />
          30 à 60 secondes · 50 Mo maximum
        </div>

        <input
          type="file"
          accept="video/mp4"
          onChange={handleSellerWelcomeVideoChange}
        />

        {sellerWelcomeVideoError && (
          <div role="alert" style={{ marginTop: 10, fontSize: 13, color: "#dc2626" }}>
            {sellerWelcomeVideoError}
          </div>
        )}

        {sellerWelcomeVideo && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            ✓ {sellerWelcomeVideo.name}
          </div>
        )}
      </div>

    </div>

    <div
      style={{
        display: "flex",
        gap: 10,
        marginTop: 20,
      }}
    >
      <button
        onClick={() => setActivationScreen("company")}
        style={{
          flex: 1,
          height: 46,
          borderRadius: 12,
          border: "1px solid #d1d5db",
          background: "white",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        ← Retour
      </button>

      <button
        disabled={!sellerMediaValid}
        onClick={() => setActivationScreen("activation")}
        style={{
          flex: 2,
          height: 46,
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          color: "white",
          cursor: sellerMediaValid ? "pointer" : "not-allowed",
          opacity: sellerMediaValid ? 1 : 0.5,
          fontWeight: 700,
        }}
      >
        Continuer →
      </button>
    </div>
  </>
)}

{activationScreen === "activation" && (
  <>
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
      <h2 style={{ marginBottom: 8 }}>Votre dossier est prêt</h2>
      <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5 }}>
        Vos informations professionnelles et vos médias sont prêts pour l’activation de votre espace NovaPulse.
      </p>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
        <strong>✓ Informations professionnelles</strong>
        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.5 }}>
          Vos informations d’entreprise ont été renseignées.
        </p>
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
        <strong>✓ Identité NovaPulse</strong>
        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.5 }}>
          Votre logo et vos deux vidéos sont prêts.
        </p>
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
        <strong>📞 Dernière étape : l’appel d’activation</strong>
        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.5 }}>
          La dernière étape consiste à réserver un appel avec NovaPulse. Pendant cet appel, nous finaliserons avec vous la configuration de Telegram, la création du supergroupe et le branchement de votre espace NovaPulse.
        </p>
      </div>
    </div>

    <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f8fafc", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
      Vous restez présent pendant toute la configuration. NovaPulse ne vous demandera pas de transmettre ni ne conservera votre mot de passe Telegram ou vos codes de sécurité.
    </div>

    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, fontSize: 14, lineHeight: 1.5, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={telegramActivationConsent}
        onChange={(e) => setTelegramActivationConsent(e.target.checked)}
      />
      <span>J’autorise NovaPulse à m’accompagner dans la configuration de mon compte Telegram pendant l’appel d’activation.</span>
    </label>

    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
      <button
        type="button"
        onClick={() => setActivationScreen("media")}
        style={{ flex: 1, height: 46, borderRadius: 12, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontWeight: 600 }}
      >
        ← Retour
      </button>
      <button
        type="button"
        disabled={!telegramActivationConsent}
        style={{ flex: 2, minHeight: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "white", opacity: telegramActivationConsent ? 1 : 0.5, cursor: telegramActivationConsent ? "pointer" : "not-allowed", fontWeight: 700 }}
      >
        Réserver mon appel d’activation
      </button>
    </div>
  </>
)}
    </div>
  </div>
)}

    <footer className="input-bar">

      <div className="composer">

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleClientMedia}
        />

        <button
          className="plus-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isIdentified}
        >
          📎
        </button>

      <div className="plus-wrapper">
        <button
          className="plus-menu-button"
          onClick={() => setShowMenu(!showMenu)}
        >
          +
        </button>

        {showMenu && (
          <div className="plus-menu">
            <button
              onClick={() => {
                loadHistory();
                setShowMenu(false);
              }}
            >
              📜 Historique des échanges
            </button>

            <button
              onClick={() => {
                loadPayments();
                setShowMenu(false);
              }}
            >
              💳 Paiements & facturation
            </button>


            <button
              onClick={() => {
                loadPurchasedGallery();
                setShowMenu(false);
              }}
            >
              📁 Contenus achetés
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                setShowActivationIntro(true);
              }}
            >
              ⚡ Activer NovaPulse
            </button>

          </div>
        )}
      </div>

      <input
        ref={inputRef}
        className="input"
        placeholder="Écrivez..."
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
    <div className="modal-box beta-modal">

      <div className="beta-left">
        <div className="beta-video-wrapper">
          <video
            className="beta-video"
            src={`/sellers/${sellerSlug}/beta-video.mp4`}
            autoPlay
            muted
            loop
            playsInline
            controls
          />

          <div className="beta-video-overlay">
            <div className="beta-video-badge">
              ▶ Démo rapide
            </div>
          </div>
        </div>
      </div>

      <div className="beta-right">
        <div className="tools-logos">
          <img className="logo-whatsapp" src={`/sellers/${sellerSlug}/logos/whatsapp.svg`} />
          <img className="logo-gmail" src={`/sellers/${sellerSlug}/logos/gmail.svg`} />
          <img className="logo-calendar" src={`/sellers/${sellerSlug}/logos/calendar.svg`} />
          <img className="logo-calendly" src={`/sellers/${sellerSlug}/logos/calendly.svg`} />
          <img className="logo-stripe" src={`/sellers/${sellerSlug}/logos/stripe.svg`} />
        </div>

        <h2>
          Rejoignez<span className="marker">NovaPulse</span>
        </h2>

        <p className="beta-subtitle">
          Découvrez en avant-première comment vos clients peuvent
          <strong> réserver, échanger et payer </strong>
          dans une seule conversation.
        </p>

        

        

        {!showLoginCode ? (
  <>
    <input
      type="email"
      placeholder="Entrez votre email pour vous inscrire"
      value={emailInput}
      onChange={(e) => setEmailInput(e.target.value)}
      className="input beta-input"
    />

    {showFullForm && (
      <>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 10,
            width: "100%",
          }}
        >
          <button
            type="button"
            className={clientType === "particulier" ? "selected-btn" : ""}
            onClick={() => setClientType("particulier")}
            style={{
              border:
                clientType === "particulier"
                  ? "2px solid #111827"
                  : "1px solid #eee",
              background:
                clientType === "particulier" ? "#fff" : "#f9fafb",
              fontWeight: clientType === "particulier" ? 700 : 500,
            }}
          >
            👤 Particulier
          </button>

          <button
            type="button"
            className={clientType === "entreprise" ? "selected-btn" : ""}
            onClick={() => setClientType("entreprise")}
            style={{
              border:
                clientType === "entreprise"
                  ? "2px solid #111827"
                  : "1px solid #eee",
              background:
                clientType === "entreprise" ? "#fff" : "#f9fafb",
              fontWeight: clientType === "entreprise" ? 700 : 500,
            }}
          >
            🏢 Entreprise
          </button>
        </div>

        {clientType === "entreprise" && (
          <>
            <div
              style={{
                marginTop: 10,
                width: "100%",
                fontSize: 13,
                lineHeight: 1.4,
                color: "#374151",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
                boxSizing: "border-box",
              }}
            >
              <strong>Entreprise ?</strong>
              <br />
              Vérifiez que vous disposez d’une adresse électronique de facturation active avant de continuer. Si vous n'en avez pas, vous ne pourrez pas effectuer d'achats.
              <br />

              <a
                href="https://facturation.chorus-pro.gouv.fr/annuaire/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Vérifier dans l’annuaire officiel
              </a>
            </div>

            <div style={{ marginTop: 10, width: "100%" }}>
              <input
                placeholder="Nom entreprise"
                value={entrepriseNom}
                onChange={(e) => setEntrepriseNom(e.target.value)}
                className="input"
              />

              <input
                placeholder="SIRET"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                className="input"
              />

              <input
                placeholder="TVA (optionnel)"
                value={tva}
                onChange={(e) => setTva(e.target.value)}
                className="input"
              />
            </div>
          </>
        )}
      </>
    )}

    <button
      className="send-button"
      onClick={showFullForm ? registerClient : checkClientAndContinue}
    >
      👥 Accès privé
    </button>
  </>
) : (
  <>
    <p style={{ marginBottom: 10 }}>
      Un code à 6 chiffres a été envoyé à
      <br />
      <strong>{emailInput}</strong>
    </p>

    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      value={loginCode}
      onChange={(e) =>
        setLoginCode(
          e.target.value.replace(/\D/g, "").slice(0, 6)
        )
      }
      className="input beta-input"
      style={{
        textAlign: "center",
        letterSpacing: "8px",
        fontSize: "22px",
      }}
    />

    <button
      className="send-button"
      onClick={verifyLoginCode}
    >
      Se connecter
    </button>

    <button
      type="button"
      onClick={() => {
        setShowLoginCode(false);
        setLoginCode("");
      }}
      style={{
        marginTop: 10,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      Modifier l'adresse e-mail
    </button>
  </>
)}

        <p className="secure-note">
          🔒 Données et paiements protégés — accès strictement confidentiel
        </p>
      </div>

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


{showCalendly && sellerConfig?.calendly && (
  <div
    className="modal-overlay"
    onClick={() => setShowCalendly(false)}
  >
    <div
      className="modal-box"
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: "900px",
        width: "95%",
        height: "85vh",
        padding: 0,
        overflow: "hidden",
        position: "relative"
      }}
    >
      <button
        onClick={() => setShowCalendly(false)}
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          zIndex: 10,
          background: "white",
          border: "none",
          fontSize: 28,
          cursor: "pointer"
        }}
      >
        ×
      </button>

      <iframe
        src={`${sellerConfig.calendly}?hide_event_type_details=1&hide_gdpr_banner=1`}
        width="100%"
        height="100%"
        frameBorder="0"
        title="Réserver un appel"
      />
        </div>
      </div>
    )}

    {showReviewModal && (
      <div
        className="modal-overlay"
        onClick={() => setShowReviewModal(false)}
      >
        <div
          className="modal-box"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "420px", width: "92%" }}
        >
          <h3>Laisser un avis</h3>

          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
            Votre retour aide ce professionnel à inspirer confiance aux prochains clients.
          </p>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Écrivez votre avis ici..."
            rows={5}
            style={{
              width: "100%",
              resize: "none",
              borderRadius: 12,
              padding: 12,
              border: "1px solid #ddd",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />

          <button
            className="pay-button"
            onClick={sendReview}
            disabled={isSendingReview || !reviewText.trim()}
            style={{ width: "100%", marginTop: 12 }}
          >
            {isSendingReview ? "Envoi..." : "Valider mon avis"}
          </button>

          <button
            className="history-button"
            onClick={() => setShowReviewModal(false)}
            style={{ width: "100%", marginTop: 8 }}
          >
            Annuler
          </button>
        </div>
      </div>
    )}
    {quoteModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        background: "white",
        borderRadius: 18,
        padding: 24,
        width: "100%",
        maxWidth: 430,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Accepter le devis</h2>

      <p style={{ fontSize: 14 }}>
        Devis : <strong>{quoteModal.quoteId}</strong>
      </p>

      <input
        type="text"
        placeholder="Nom et prénom"
        value={quoteSignerName}
        onChange={(e) => setQuoteSignerName(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          boxSizing: "border-box",
          marginBottom: 14,
        }}
      />

      <input
        type="email"
        value={clientEmail || ""}
        readOnly
        style={{
          width: "100%",
          padding: 12,
          boxSizing: "border-box",
          marginBottom: 14,
          background: "#f3f3f3",
        }}
      />

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          fontSize: 14,
          marginBottom: 20,
        }}
      >
        <input
          type="checkbox"
          checked={quoteConsent}
          onChange={(e) => setQuoteConsent(e.target.checked)}
        />

        <span>
          J'ai lu le devis et j'accepte son contenu et ses conditions.
        </span>
      </label>

      <button
        type="button"
        disabled={!quoteSignerName.trim() || !quoteConsent}
        onClick={async () => {
          try {
            const res = await fetch(`${BRIDGE_URL}/pwa/quote/accept`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                quoteId: quoteModal.quoteId,
                signerName: quoteSignerName.trim(),
                email: clientEmail,
                consent: quoteConsent,
              }),
            });

            const data = await res.json();

            if (!res.ok || !data?.success) {
              console.error("❌ Acceptation devis échouée :", data);
              alert("Impossible d'accepter le devis.");
              return;
            }

            console.log("✅ Devis accepté :", data);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.quoteId === quoteModal.quoteId
                  ? {
                      ...msg,
                      quoteStatus: "accepted",
                    }
                  : msg
              )
            );

            setQuoteModal(null);
            alert("✅ Devis accepté avec succès");
          } catch (err) {
            console.error("❌ Erreur acceptation devis :", err);
            alert("Erreur lors de l'acceptation du devis.");
          }
        }}
        style={{
          width: "100%",
          padding: 13,
          border: 0,
          borderRadius: 10,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Confirmer l'acceptation
      </button>

      <button
        type="button"
        onClick={() => setQuoteModal(null)}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 10,
          border: 0,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        Annuler
      </button>
    </div>
  </div>
)}
      </div>
    );
    }


export default App;