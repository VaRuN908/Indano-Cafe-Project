// ========== SMART ETHICAL AI CAFE CHATBOT ==========

(function () {
  "use strict";

  // ── State Management ──
  const state = {
    isOpen: false,
    isMinimized: false,
    isProcessing: false,
    speechEnabled: true, // Default to true
    activeTimeout: null, // For cancelling mock response
    controller: null, // For future-proofing (AbortController)
  };

  // ── AI Speech (Text-to-Speech) ──
  function stripForSpeech(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/[•🥗🔥💰☕🍰⭐📋🌶️🌿🧀📍🅿️📞📧🍽️👋😊😄🛠️💬🤖👑●]/g, "")
      .replace(/₹/g, "rupees ")
      .replace(/\n+/g, ". ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function speakText(text) {
    if (!state.speechEnabled) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const clean = stripForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-IN";
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) =>
          v.lang.startsWith("en") && v.name.toLowerCase().includes("female"),
      ) ||
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }

  function toggleSpeech() {
    state.speechEnabled = !state.speechEnabled;
    const btn = document.getElementById("chatbot-speech-btn");
    if (btn) {
      if (state.speechEnabled) {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        btn.title = "Mute Voice";
        btn.style.opacity = "1";
      } else {
        window.speechSynthesis.cancel();
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        btn.title = "Enable Voice";
        btn.style.opacity = "0.5";
      }
    }
  }

  // ── Time-Based Greeting ──
  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () =>
      window.speechSynthesis.getVoices();
  }

  // ── Cafe Menu Knowledge Base ──
  const MENU = {
    healthyCombos: [
      {
        name: "Green Goddess Bowl",
        price: 249,
        desc: "Quinoa, avocado, greens, hummus & lemon dressing",
        cal: 380,
      },
      {
        name: "Protein Power Plate",
        price: 279,
        desc: "Grilled paneer, sprouts, boiled eggs & multigrain toast",
        cal: 420,
      },
      {
        name: "Detox Delight",
        price: 199,
        desc: "Fresh juice, oats bowl & mixed fruits",
        cal: 290,
      },
      {
        name: "Fit & Fresh Combo",
        price: 229,
        desc: "Grilled sandwich, green smoothie & salad",
        cal: 350,
      },
    ],
    todaysSpecial: [
      {
        name: "Masala Dosa Feast",
        price: 179,
        desc: "Crispy masala dosa with sambar, chutney & filter coffee",
        cal: 450,
      },
      {
        name: "Royal Thali",
        price: 349,
        desc: "Dal, paneer, 3 rotis, rice, raita, salad & dessert",
        cal: 680,
      },
      {
        name: "Chef's Pasta Supreme",
        price: 269,
        desc: "Creamy alfredo pasta with garlic bread & cold coffee",
        cal: 520,
      },
    ],
    budgetMeals: [
      {
        name: "Student Saver",
        price: 99,
        desc: "Veg sandwich + chai",
        cal: 310,
      },
      {
        name: "Quick Bite Combo",
        price: 129,
        desc: "Samosa (2pcs) + masala chai + cookies",
        cal: 380,
      },
      {
        name: "Light Lunch",
        price: 149,
        desc: "Mini thali: dal, rice, roti & pickle",
        cal: 400,
      },
    ],
    drinks: [
      { name: "Classic Filter Coffee", price: 79 },
      { name: "Hazelnut Latte", price: 149 },
      { name: "Mango Lassi", price: 99 },
      { name: "Matcha Green Tea", price: 129 },
      { name: "Cold Brew", price: 169 },
    ],
    desserts: [
      { name: "Gulab Jamun (2pcs)", price: 69 },
      { name: "Chocolate Lava Cake", price: 179 },
      { name: "Mango Kulfi", price: 89 },
      { name: "Tiramisu", price: 199 },
    ],
    popular: [
      { name: "Masala Dosa", price: 129 },
      { name: "Paneer Tikka", price: 199 },
      { name: "Butter Chicken", price: 279 },
      { name: "Veg Biryani", price: 189 },
      { name: "Cheese Burst Pizza", price: 249 },
      { name: "Classic Burger", price: 159 },
    ],
  };

  // ── Context Tracker ──
  const userContext = {
    mentionedItems: [],
    interests: new Set(),
    confusionCount: 0,
    messageCount: 0,
    lastSuggestionType: null,
  };

  // ── Logic Helpers ──
  const CONFUSION_WORDS = [
    "confused",
    "confuse",
    "don't know",
    "not sure",
    "maybe",
    "i think",
    "hmm",
    "what should",
    "suggest me",
    "help me",
    "can't decide",
    "which one",
    "recommend",
    "idk",
    "no idea",
  ];

  function detectConfusion(text) {
    return CONFUSION_WORDS.some((w) => text.toLowerCase().includes(w));
  }

  function extractInterests(text) {
    const lower = text.toLowerCase();
    const map = {
      healthy: [
        "healthy",
        "fit",
        "diet",
        "low cal",
        "salad",
        "detox",
        "protein",
      ],
      budget: [
        "budget",
        "cheap",
        "affordable",
        "student",
        "saver",
        "economical",
      ],
      dessert: ["dessert", "sweet", "cake", "brownie", "kulfi", "chocolate"],
      drink: ["drink", "coffee", "tea", "juice", "lassi", "latte", "shake"],
      spicy: ["spicy", "masala", "tikka", "hot", "chilli"],
    };
    for (const [interest, keywords] of Object.entries(map)) {
      if (keywords.some((k) => lower.includes(k))) {
        userContext.interests.add(interest);
      }
    }
  }

  // ── Format Menu Items ──
  function formatItems(items, limit) {
    const list = items.slice(0, limit || items.length);
    return list
      .map((item) => {
        let line = `• **${item.name}** — ₹${item.price}`;
        if (item.desc) line += `\n  _${item.desc}_`;
        return line;
      })
      .join("\n\n");
  }

  // ── Generate Response (Mock AI) ──
  function generateResponse(userMessage) {
    const lower = userMessage.toLowerCase().trim();
    extractInterests(userMessage);
    userContext.messageCount++;

    if (detectConfusion(lower)) {
      return `No worries! Let me suggest something popular:\n\n🔥 **Today's Special:** ${MENU.todaysSpecial[0].name} (₹${MENU.todaysSpecial[0].price})\n\nWould you like to try that?`;
    }

    if (/^(hi|hello|hey|start)/i.test(lower)) {
      return `Hello! Welcome to **Indiano Cafe** ☕\n\nI can help you with:\n• 🥗 Healthy options\n• 💰 Budget meals\n• 🍰 Desserts\n\nWhat are you in the mood for?`;
    }

    if (/menu|food|list/i.test(lower)) {
      return `Here's a quick look at our menu categories:\n\n• **Healthy Combos** (₹199+)\n• **Chef's Specials** (₹179+)\n• **Budget Meals** (₹99+)\n• **Drinks & Desserts**\n\nJust ask "Show me healthy food" or "Best budget meal"!`;
    }

    if (/healthy|diet|salad/i.test(lower)) {
      return `Going healthy? Good choice! 🥗\n\n${formatItems(MENU.healthyCombos)}`;
    }

    if (/budget|cheap|student/i.test(lower)) {
      return `Here are our best value meals: 💰\n\n${formatItems(MENU.budgetMeals)}`;
    }

    if (/drink|coffee|tea/i.test(lower)) {
      return `Thirsty? Try these: ☕\n\n${formatItems(MENU.drinks)}`;
    }

    if (/dessert|sweet|cake/i.test(lower)) {
      return `Treat yourself! 🍰\n\n${formatItems(MENU.desserts)}`;
    }

    if (/popular|best/i.test(lower)) {
      return `Our customer favorites: ⭐\n\n${formatItems(MENU.popular)}`;
    }

    if (/bye|goodbye/i.test(lower)) {
      return "Goodbye! 👋 Hope to see you at Indiano Cafe soon!";
    }

    // Default
    return `I'm not exactly sure, but I recommend checking our **Today's Special**!\n\n${formatItems([MENU.todaysSpecial[0]])}\n\nCan I help you find something else?`;
  }

  // ── DOM Construction ──
  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function addMessage(text, sender) {
    const chatBody = document.getElementById("chatbot-body");
    const msg = document.createElement("div");
    msg.className = `chatbot-msg chatbot-msg-${sender}`;

    const bubble = document.createElement("div");
    bubble.className = `chatbot-bubble chatbot-bubble-${sender}`;
    bubble.innerHTML = renderMarkdown(text);

    const time = document.createElement("span");
    time.className = "chatbot-time";
    time.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    msg.appendChild(bubble);
    msg.appendChild(time);
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (sender === "bot") {
      speakText(text);
    }
  }

  // ── Suggestions ──
  function getSuggestions() {
    const interests = userContext.interests;
    if (interests.has("healthy"))
      return ["Green Goddess Bowl", "Protein Plate", "Detox Menu"];
    if (interests.has("budget"))
      return ["Student Saver", "Value Combo", "Under ₹150"];
    return ["Healthy Menu", "Today's Special", "Budget Meals", "Desserts"];
  }

  function updateSuggestionButtons() {
    const container = document.getElementById("chatbot-suggestions");
    if (!container) return;
    container.innerHTML = "";
    getSuggestions()
      .slice(0, 4)
      .forEach((text) => {
        const btn = document.createElement("button");
        btn.className = "chatbot-suggestion-btn";
        btn.textContent = text;
        btn.onclick = () => sendMessage(text);
        container.appendChild(btn);
      });
  }

  // ── UI Control & Logic ──
  function setProcessingState(isProcessing) {
    state.isProcessing = isProcessing;
    const panel = document.getElementById("chatbot-panel");
    const input = document.getElementById("chatbot-input");
    const sendBtn = document.getElementById("chatbot-send-btn");
    const stopBtn = document.getElementById("chatbot-stop-btn");

    if (isProcessing) {
      panel.classList.add("chatbot-processing");
      input.disabled = true;
      sendBtn.disabled = true;
      stopBtn.style.display = "flex"; // Show stop button via JS or CSS

      // Add typing indicator
      const chatBody = document.getElementById("chatbot-body");
      const typing = document.createElement("div");
      typing.id = "chatbot-typing";
      typing.className = "chatbot-msg chatbot-msg-bot";
      typing.innerHTML = `<div class="chatbot-bubble chatbot-typing-bubble">
                <span class="chatbot-dot"></span><span class="chatbot-dot"></span><span class="chatbot-dot"></span>
            </div>`;
      chatBody.appendChild(typing);
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      panel.classList.remove("chatbot-processing");
      input.disabled = false;
      sendBtn.disabled = false;
      stopBtn.style.display = "none";
      input.focus();

      // Remove typing indicator
      const typing = document.getElementById("chatbot-typing");
      if (typing) typing.remove();
    }
  }

  function stopGeneration() {
    if (state.activeTimeout) {
      clearTimeout(state.activeTimeout);
      state.activeTimeout = null;
    }
    setProcessingState(false);
    // addMessage("Create cancelled.", "bot"); // Optional: Feedback that it stopped
  }

  function sendMessage(text) {
    if (!text || !text.trim()) return;
    if (state.isProcessing) return;

    addMessage(text.trim(), "user");
    document.getElementById("chatbot-input").value = "";

    setProcessingState(true);

    const delay = 1000 + Math.random() * 1000; // Simulated AI delay

    state.activeTimeout = setTimeout(() => {
      const response = generateResponse(text);
      setProcessingState(false);
      addMessage(response, "bot");
      updateSuggestionButtons();
    }, delay);
  }

  // ── Panel Toggles ──
  function toggleChatbot(action) {
    const panel = document.getElementById("chatbot-panel");
    const fab = document.getElementById("chatbot-fab");

    if (action === "open") {
      state.isOpen = true;
      state.isMinimized = false;
      panel.classList.remove("chatbot-minimized");
      panel.classList.add("chatbot-open");
      fab.classList.remove("chatbot-fab-visible");
    } else if (action === "minimize") {
      state.isOpen = true; // Still conceptually open, just minimized
      state.isMinimized = true;
      panel.classList.add("chatbot-open");
      panel.classList.add("chatbot-minimized");
      fab.classList.remove("chatbot-fab-visible");
    } else if (action === "close") {
      state.isOpen = false;
      state.isMinimized = false;
      panel.classList.remove("chatbot-open");
      panel.classList.remove("chatbot-minimized");
      fab.classList.add("chatbot-fab-visible");
      // Stop generating if closing
      stopGeneration();
    }
  }

  // ── Event Listeners ──
  function init() {
    const fab = document.getElementById("chatbot-fab");
    const closeBtn = document.getElementById("chatbot-close-btn");
    const minimizeBtn = document.getElementById("chatbot-minimize-btn");
    const sendBtn = document.getElementById("chatbot-send-btn");
    const stopBtn = document.getElementById("chatbot-stop-btn");
    const speechBtn = document.getElementById("chatbot-speech-btn");
    const input = document.getElementById("chatbot-input");
    const header = document.getElementById("chatbot-header");

    fab.addEventListener("click", () => toggleChatbot("open"));
    closeBtn.addEventListener("click", () => toggleChatbot("close"));
    minimizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleChatbot("minimize");
    });

    // Click on header to expand if minimized
    header.addEventListener("click", () => {
      if (state.isMinimized) toggleChatbot("open");
    });

    sendBtn.addEventListener("click", () => sendMessage(input.value));
    stopBtn.addEventListener("click", stopGeneration);
    speechBtn.addEventListener("click", toggleSpeech);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });

    // Initialize state
    toggleChatbot("close"); // Start closed
    setTimeout(() => {
      toggleChatbot("open"); // Auto-open for demo
      const greeting = getTimeGreeting();
      addMessage(
        `${greeting}! Welcome to **Indiano Cafe**. How can I help you today?`,
        "bot",
      );
      updateSuggestionButtons();
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
