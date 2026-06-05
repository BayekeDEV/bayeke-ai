import { api, getToken, setToken, clearAuth } from "./api.js";



const elements = {

  sidebar: document.getElementById("sidebar"),

  sidebarOverlay: document.getElementById("sidebar-overlay"),

  sidebarOpen: document.getElementById("sidebar-open"),

  sidebarClose: document.getElementById("sidebar-close"),

  newChatBtn: document.getElementById("new-chat-btn"),

  chatHistory: document.getElementById("chat-history"),

  chatTitle: document.getElementById("chat-title"),

  welcomeScreen: document.getElementById("welcome-screen"),

  messagesList: document.getElementById("messages-list"),

  messagesContainer: document.getElementById("messages-container"),

  chatForm: document.getElementById("chat-form"),

  messageInput: document.getElementById("message-input"),

  submitBtn: document.getElementById("submit-btn"),

  attachBtn: document.getElementById("attach-btn"),

  imageInput: document.getElementById("image-input"),

  imagePreview: document.getElementById("image-preview"),

  imagePreviewThumb: document.getElementById("image-preview-thumb"),

  imagePreviewName: document.getElementById("image-preview-name"),

  imagePreviewRemove: document.getElementById("image-preview-remove"),

  errorBanner: document.getElementById("error-banner"),

  statusBadge: document.getElementById("status-badge"),

  starterCards: document.querySelectorAll(".starter-card"),

  authOverlay: document.getElementById("auth-overlay"),

  authForm: document.getElementById("auth-form"),

  authEmail: document.getElementById("auth-email"),

  authPassword: document.getElementById("auth-password"),

  authName: document.getElementById("auth-name"),

  authNameWrap: document.getElementById("auth-name-wrap"),

  authError: document.getElementById("auth-error"),

  authSubmit: document.getElementById("auth-submit"),

  authTabLogin: document.getElementById("auth-tab-login"),

  authTabRegister: document.getElementById("auth-tab-register"),

  logoutBtn: document.getElementById("logout-btn"),

  shareBtn: document.getElementById("share-btn"),

  userInfo: document.getElementById("user-info"),

  userEmail: document.getElementById("user-email"),

  chatSearchWrap: document.getElementById("chat-search-wrap"),

  chatSearchInput: document.getElementById("chat-search-input"),

  searchChatsBtn: document.getElementById("search-chats-btn"),

  clearAllChatsBtn: document.getElementById("clear-all-chats-btn"),

  profileFooter: document.getElementById("profile-footer"),

  profileToggle: document.getElementById("profile-toggle"),

  profileMenu: document.getElementById("profile-menu"),

  profileAvatar: document.getElementById("profile-avatar"),

  profileName: document.getElementById("profile-name"),

  profileEmail: document.getElementById("profile-email"),

  profileChevron: document.getElementById("profile-chevron"),

  menuAccount: document.getElementById("menu-account"),

  menuSettings: document.getElementById("menu-settings"),

  menuLogout: document.getElementById("menu-logout"),

  accountModal: document.getElementById("account-modal"),

  settingsModal: document.getElementById("settings-modal"),

  accountAvatar: document.getElementById("account-avatar"),

  accountName: document.getElementById("account-name"),

  accountEmail: document.getElementById("account-email"),

  accountId: document.getElementById("account-id"),

  accountAi: document.getElementById("account-ai"),

  accountChatsCount: document.getElementById("account-chats-count"),

  accountCopyEmail: document.getElementById("account-copy-email"),

  settingsAiModel: document.getElementById("settings-ai-model"),

  settingsClearChats: document.getElementById("settings-clear-chats"),

  settingsLogout: document.getElementById("settings-logout"),

  toggleEnterSend: document.getElementById("toggle-enter-send"),

};

const SHIELD_SVG = `<svg class="shield-icon w-7 h-7 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>`;

const SETTINGS_KEY = "bayeke-settings";

let chatSearchQuery = "";

let profileMenuOpen = false;

let settings = { enterToSend: true };



let chats = [];

let activeChat = null;

let isLoading = false;

let serverStatus = null;

let currentUser = null;

let authMode = "login";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_PLACEHOLDER = "[Сурет]";

/** @type {{ mimeType: string, data: string, previewUrl: string, name: string } | null} */
let pendingImage = null;



function getInitials(user) {
  if (user?.name?.trim()) {
    return user.name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (user?.email) return user.email[0].toUpperCase();
  return "?";
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    settings = { enterToSend: saved.enterToSend !== false };
  } catch {
    settings = { enterToSend: true };
  }
  syncSettingsUI();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  syncSettingsUI();
}

function syncSettingsUI() {
  if (elements.toggleEnterSend) {
    elements.toggleEnterSend.classList.toggle("on", settings.enterToSend);
    elements.toggleEnterSend.setAttribute("aria-checked", String(settings.enterToSend));
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
  closeProfileMenu();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach((m) => m.classList.add("hidden"));
}

function toggleProfileMenu() {
  profileMenuOpen = !profileMenuOpen;
  elements.profileMenu?.classList.toggle("hidden", !profileMenuOpen);
  elements.profileChevron?.classList.toggle("rotate-180", profileMenuOpen);
}

function closeProfileMenu() {
  profileMenuOpen = false;
  elements.profileMenu?.classList.add("hidden");
  elements.profileChevron?.classList.remove("rotate-180");
}

function fillAccountModal() {
  if (!currentUser) return;
  const initials = getInitials(currentUser);
  if (elements.accountAvatar) elements.accountAvatar.textContent = initials;
  if (elements.accountName) elements.accountName.textContent = currentUser.name || "Пайдаланушы";
  if (elements.accountEmail) elements.accountEmail.textContent = currentUser.email;
  if (elements.accountId) elements.accountId.textContent = currentUser.id || "—";
  if (elements.accountAi) {
    const p = serverStatus?.aiProvider === "groq" ? "Groq" : serverStatus?.aiProvider === "gemini" ? "Gemini" : "—";
    elements.accountAi.textContent = p;
  }
  if (elements.accountChatsCount) elements.accountChatsCount.textContent = String(chats.length);
  if (elements.settingsAiModel) {
    elements.settingsAiModel.textContent = serverStatus?.aiProvider === "groq" ? "Groq (llama)" : serverStatus?.aiProvider === "gemini" ? "Gemini" : "—";
  }
}

async function deleteAllChats() {
  if (!chats.length) return;
  if (!confirm(`Барлық ${chats.length} чатты жою керек пе?`)) return;
  const ids = [...chats.map((c) => c.id)];
  for (const id of ids) {
    await api.deleteChat(id);
  }
  chats = [];
  activeChat = null;
  await startNewChat();
  render();
}

function toggleChatSearch() {
  const wrap = elements.chatSearchWrap;
  if (!wrap) return;
  const show = wrap.classList.contains("hidden");
  wrap.classList.toggle("hidden", !show);
  elements.searchChatsBtn?.classList.toggle("active", show);
  if (show) {
    elements.chatSearchInput?.focus();
  } else {
    chatSearchQuery = "";
    if (elements.chatSearchInput) elements.chatSearchInput.value = "";
    renderHistory();
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessageHtml(text) {

  const escaped = escapeHtml(text);

  const blocks = [];

  let lastIndex = 0;

  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;

  let match;



  while ((match = codeBlockRegex.exec(escaped)) !== null) {

    if (match.index > lastIndex) {

      blocks.push(formatInline(escaped.slice(lastIndex, match.index)));

    }

    blocks.push(`<pre><code>${match[2].trim()}</code></pre>`);

    lastIndex = match.index + match[0].length;

  }



  if (lastIndex < escaped.length) {

    blocks.push(formatInline(escaped.slice(lastIndex)));

  }



  return blocks.join("") || formatInline(escaped);

}



function formatInline(text) {

  return text

    .split(/\n\n+/)

    .map((para) => {

      const withCode = para.replace(/`([^`]+)`/g, "<code>$1</code>");

      return `<p>${withCode.replace(/\n/g, "<br>")}</p>`;

    })

    .join("");

}



function showError(message) {

  elements.errorBanner.textContent = message;

  elements.errorBanner.classList.remove("hidden");

}



function hideError() {

  elements.errorBanner.classList.add("hidden");

  elements.errorBanner.textContent = "";

}



function openSidebar() {

  elements.sidebar.classList.add("open");

  elements.sidebar.classList.remove("-translate-x-full");

  elements.sidebarOverlay.classList.add("visible");

}



function closeSidebar() {

  elements.sidebar.classList.remove("open");

  elements.sidebar.classList.add("-translate-x-full");

  elements.sidebarOverlay.classList.remove("visible");

}



function autoResizeInput() {

  const input = elements.messageInput;

  input.style.height = "auto";

  input.style.height = `${Math.min(input.scrollHeight, 192)}px`;

}



function updateSubmitState() {

  const hasText = elements.messageInput.value.trim().length > 0;

  const hasImage = Boolean(pendingImage);

  elements.submitBtn.disabled = (!hasText && !hasImage) || isLoading;

  if (elements.attachBtn) {
    elements.attachBtn.disabled = isLoading;
  }

}



function clearPendingImage() {

  if (pendingImage?.previewUrl) {
    URL.revokeObjectURL(pendingImage.previewUrl);
  }

  pendingImage = null;

  if (elements.imageInput) elements.imageInput.value = "";

  elements.imagePreview?.classList.add("hidden");

  updateSubmitState();

}



function showImagePreview(file, previewUrl) {

  elements.imagePreviewThumb.src = previewUrl;

  elements.imagePreviewThumb.alt = file.name;

  elements.imagePreviewName.textContent = file.name;

  elements.imagePreview.classList.remove("hidden");

}



async function handleImageFile(file) {

  if (!file) return;

  hideError();

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    showError("Тек JPEG, PNG, WebP немесе GIF жіберуге болады.");
    return;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    showError("Сурет 4 МБ-тан аспауы керек.");
    return;
  }

  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("read failed"));
        return;
      }
      const base64 = result.replace(/^data:[^;]+;base64,/, "");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  clearPendingImage();

  const previewUrl = URL.createObjectURL(file);
  pendingImage = {
    mimeType: file.type,
    data,
    previewUrl,
    name: file.name,
  };

  showImagePreview(file, previewUrl);
  updateSubmitState();

}



function updateStatusBadge() {

  if (!elements.statusBadge || !serverStatus) return;



  const dbLabels = {

    mongodb: "MongoDB",

    postgres: "PostgreSQL",

    json: "JSON (жергілікті)",

  };

  const dbLabel = dbLabels[serverStatus.database] || serverStatus.database;

  const aiLabel =
    serverStatus.ai === "configured"
      ? serverStatus.aiProvider === "groq"
        ? "Groq ИИ"
        : "Gemini ИИ"
      : "ИИ кілті жоқ";



  if (currentUser) {

    elements.statusBadge.textContent = `${currentUser.name || currentUser.email}`;

    elements.statusBadge.title = `${dbLabel} · ${aiLabel}`;

  } else {

    elements.statusBadge.textContent = `${dbLabel} · ${aiLabel}`;

  }

}



function showAuthOverlay() {

  elements.authOverlay?.classList.remove("hidden");

}



function hideAuthOverlay() {

  elements.authOverlay?.classList.add("hidden");

}



function showAuthError(message) {

  if (!elements.authError) return;

  elements.authError.textContent = message;

  elements.authError.classList.remove("hidden");

}



function hideAuthError() {

  elements.authError?.classList.add("hidden");

}



function setAuthMode(mode) {

  authMode = mode;

  const isRegister = mode === "register";



  elements.authNameWrap?.classList.toggle("hidden", !isRegister);

  elements.authSubmit.textContent = isRegister ? "Тіркелу" : "Кіру";

  elements.authPassword.autocomplete = isRegister

    ? "new-password"

    : "current-password";



  elements.authTabLogin.className = [
    "auth-tab flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
    isRegister
      ? "text-white/50 hover:text-white/80"
      : "bg-white/15 text-white",
  ].join(" ");

  elements.authTabRegister.className = [
    "auth-tab flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
    isRegister
      ? "bg-white/15 text-white"
      : "text-white/50 hover:text-white/80",
  ].join(" ");



  hideAuthError();

}



function updateUserUI() {

  if (currentUser) {

    elements.userInfo?.classList.remove("hidden");

    elements.logoutBtn?.classList.remove("hidden");

    elements.logoutBtn?.classList.add("flex");

    elements.profileFooter?.classList.remove("hidden");

    const initials = getInitials(currentUser);

    if (elements.profileAvatar) elements.profileAvatar.textContent = initials;

    if (elements.profileName) {
      elements.profileName.textContent = currentUser.name || currentUser.email.split("@")[0];
    }

    if (elements.profileEmail) elements.profileEmail.textContent = currentUser.email;

    if (elements.userEmail) elements.userEmail.textContent = currentUser.email;

    hideAuthOverlay();

  } else {

    elements.userInfo?.classList.add("hidden");

    elements.logoutBtn?.classList.add("hidden");

    elements.logoutBtn?.classList.remove("flex");

    elements.profileFooter?.classList.add("hidden");

    closeProfileMenu();

    showAuthOverlay();

  }

  updateStatusBadge();

}



async function handleAuthSubmit(e) {

  e.preventDefault();

  hideAuthError();



  const email = elements.authEmail.value.trim();

  const password = elements.authPassword.value;

  const name = elements.authName?.value.trim();



  if (!email || !password) return;



  elements.authSubmit.disabled = true;



  try {

    let data;

    if (authMode === "register") {

      data = await api.register(email, password, name);

    } else {

      data = await api.login(email, password);

    }



    setToken(data.token);

    currentUser = data.user;

    updateUserUI();

    await bootstrapApp();

  } catch (err) {

    showAuthError(err.message || "Авторизация сәтсіз");

  } finally {

    elements.authSubmit.disabled = false;

  }

}



function logout() {

  clearAuth();

  currentUser = null;

  chats = [];

  activeChat = null;

  updateUserUI();

  elements.authEmail.value = "";

  elements.authPassword.value = "";

  if (elements.authName) elements.authName.value = "";

  setAuthMode("login");

}



async function ensureAuthenticated() {

  const token = getToken();

  if (!token) {

    showAuthOverlay();

    return false;

  }



  try {

    const data = await api.me();

    currentUser = data.user;

    updateUserUI();

    return true;

  } catch {

    clearAuth();

    currentUser = null;

    showAuthOverlay();

    return false;

  }

}



function createMessageElement(role, content, options = {}) {

  const isUser = role === "user";

  const wrapper = document.createElement("div");

  wrapper.className = `flex gap-2.5 items-end ${isUser ? "flex-row-reverse" : ""}`;

  const avatar = document.createElement("div");

  if (isUser) {
    avatar.className =
      "flex items-center justify-center shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white/15 text-white/70 border border-white/15";
    avatar.textContent = "Сіз";
  } else {
    avatar.className = "shrink-0";
    avatar.innerHTML = SHIELD_SVG;
  }

  const bubble = document.createElement("div");

  bubble.className = [
    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
    isUser ? "bubble-user rounded-2xl" : "bubble-assistant rounded-2xl",
  ].join(" ");



  if (options.loading) {

    bubble.innerHTML = `

      <div class="flex items-center gap-1.5 py-1" aria-label="Жүктелуде">

        <span class="loading-dot w-2 h-2 rounded-full bg-gray-400"></span>

        <span class="loading-dot w-2 h-2 rounded-full bg-gray-400"></span>

        <span class="loading-dot w-2 h-2 rounded-full bg-gray-400"></span>

      </div>`;

  } else {

    const contentEl = document.createElement("div");

    contentEl.className = "message-content";

    if (options.image?.data && options.image?.mimeType) {
      const img = document.createElement("img");
      img.className = "message-image";
      img.alt = "Жіберілген сурет";
      img.src = `data:${options.image.mimeType};base64,${options.image.data}`;
      contentEl.appendChild(img);
    }

    const text =
      typeof content === "string" && content.trim() !== IMAGE_PLACEHOLDER
        ? content
        : "";

    if (text) {
      const textEl = document.createElement("div");
      textEl.innerHTML = formatMessageHtml(text);
      contentEl.appendChild(textEl);
    }

    bubble.appendChild(contentEl);

  }



  wrapper.appendChild(avatar);

  wrapper.appendChild(bubble);

  return wrapper;

}



function renderHistory() {

  elements.chatHistory.innerHTML = "";

  const q = chatSearchQuery.trim().toLowerCase();

  const filtered = q
    ? chats.filter((c) => (c.title || "").toLowerCase().includes(q))
    : chats;

  if (!filtered.length) {

    elements.chatHistory.innerHTML = q
      ? '<p class="px-3 py-2 text-xs text-white/35">Чат табылмады</p>'
      : '<p class="px-3 py-2 text-xs text-white/35">Әлі чат жоқ</p>';

    return;

  }



  filtered.forEach((chat) => {

    const row = document.createElement("div");

    row.className = "group flex items-center gap-1";



    const btn = document.createElement("button");

    btn.type = "button";

    btn.className = [
      "flex-1 text-left px-3 py-2.5 rounded-xl text-sm truncate transition-colors border border-transparent",
      activeChat?.id === chat.id
        ? "history-active"
        : "text-white/50 hover:bg-white/8 hover:text-white/80",
    ].join(" ");

    btn.textContent = chat.title || "Жаңа сөйлесу";

    btn.title = chat.title;

    btn.addEventListener("click", () => selectChat(chat.id));



    const delBtn = document.createElement("button");

    delBtn.type = "button";

    delBtn.className =
      "opacity-0 group-hover:opacity-100 p-2 rounded-lg text-white/40 hover:text-red-300 hover:bg-white/10 shrink-0 transition-opacity";

    delBtn.setAttribute("aria-label", "Жою");

    delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-1.82-.183m-2.18 0a51.964 51.964 0 0 0-1.82.183 2.09 2.09 0 0 0-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;

    delBtn.addEventListener("click", async (e) => {

      e.stopPropagation();

      if (!confirm("Бұл чатты жою керек пе?")) return;

      await deleteChatById(chat.id);

    });



    row.appendChild(btn);

    row.appendChild(delBtn);

    elements.chatHistory.appendChild(row);

  });

}



function renderMessages() {

  const messages = activeChat?.messages ?? [];

  const hasMessages = messages.length > 0;



  if (!hasMessages && !isLoading) {

    elements.welcomeScreen.classList.remove("hidden");

    elements.messagesList.classList.add("hidden");

    elements.messagesList.innerHTML = "";

    elements.chatTitle.textContent = "Байеке ИИ";

    return;

  }



  elements.welcomeScreen.classList.add("hidden");

  elements.messagesList.classList.remove("hidden");

  elements.messagesList.innerHTML = "";

  elements.chatTitle.textContent = "Байеке ИИ";



  messages.forEach((msg) => {

    elements.messagesList.appendChild(

      createMessageElement(msg.role, msg.content, { image: msg.image })

    );

  });



  if (isLoading) {

    elements.messagesList.appendChild(

      createMessageElement("assistant", "", { loading: true })

    );

  }



  scrollToBottom();

}



function scrollToBottom() {

  requestAnimationFrame(() => {

    elements.messagesContainer.scrollTop =

      elements.messagesContainer.scrollHeight;

  });

}



function render() {

  renderHistory();

  renderMessages();

  updateSubmitState();

  updateStatusBadge();

}



async function loadHealth() {

  serverStatus = await api.health();

  updateStatusBadge();

  fillAccountModal();

}



async function loadChatList() {

  const data = await api.listChats();

  chats = data.chats ?? [];

}



async function selectChat(chatId) {

  hideError();

  const data = await api.getChat(chatId);

  activeChat = data.chat;

  render();

  closeSidebar();

}



async function startNewChat() {

  hideError();

  const data = await api.createChat("Жаңа сөйлесу");

  activeChat = { ...data.chat, messages: [] };

  await loadChatList();

  chats = [data.chat, ...chats.filter((c) => c.id !== data.chat.id)];

  elements.messageInput.value = "";

  autoResizeInput();

  render();

  closeSidebar();

  elements.messageInput.focus();

}



async function deleteChatById(chatId) {

  hideError();

  await api.deleteChat(chatId);

  chats = chats.filter((c) => c.id !== chatId);



  if (activeChat?.id === chatId) {

    activeChat = null;

    if (chats.length) {

      await selectChat(chats[0].id);

    } else {

      await startNewChat();

    }

  } else {

    render();

  }

}



async function ensureActiveChat() {

  if (activeChat?.id) return activeChat;

  await startNewChat();

  return activeChat;

}



async function sendMessage(text) {

  const trimmed = text.trim();

  const imagePayload = pendingImage
    ? { mimeType: pendingImage.mimeType, data: pendingImage.data }
    : null;

  if ((!trimmed && !imagePayload) || isLoading) return;



  hideError();

  const chat = await ensureActiveChat();



  if (!chat.messages) chat.messages = [];



  chat.messages.push({
    role: "user",
    content: trimmed || IMAGE_PLACEHOLDER,
    image: imagePayload,
  });

  isLoading = true;

  updateSubmitState();

  render();



  elements.messageInput.value = "";

  clearPendingImage();

  autoResizeInput();



  try {

    const data = await api.sendMessage(chat.id, trimmed, imagePayload);

    activeChat = data.chat;

    await loadChatList();

    const idx = chats.findIndex((c) => c.id === data.chat.id);

    if (idx >= 0) {

      chats[idx] = {

        id: data.chat.id,

        title: data.chat.title,

        updatedAt: data.chat.updatedAt,

        createdAt: data.chat.createdAt,

      };

    }

  } catch (err) {

    if (err.status === 401) {

      logout();

      showAuthError("Сессия аяқталды. Қайта кіріңіз.");

      return;

    }

    chat.messages.pop();

    showError(err.message || "Байланыс қатесі");

  } finally {

    isLoading = false;

    updateSubmitState();

    render();

    elements.messageInput.focus();

  }

}



elements.chatForm.addEventListener("submit", (e) => {

  e.preventDefault();

  sendMessage(elements.messageInput.value);

});



elements.messageInput.addEventListener("input", () => {

  autoResizeInput();

  updateSubmitState();

});



elements.messageInput.addEventListener("keydown", (e) => {

  if (e.key === "Enter" && !e.shiftKey && settings.enterToSend) {

    e.preventDefault();

    if (!elements.submitBtn.disabled) {

      sendMessage(elements.messageInput.value);

    }

  }

});



elements.searchChatsBtn?.addEventListener("click", toggleChatSearch);

elements.chatSearchInput?.addEventListener("input", () => {
  chatSearchQuery = elements.chatSearchInput.value;
  renderHistory();
});

elements.clearAllChatsBtn?.addEventListener("click", deleteAllChats);

elements.profileToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleProfileMenu();
});

elements.menuAccount?.addEventListener("click", () => {
  fillAccountModal();
  openModal("account-modal");
});

elements.menuSettings?.addEventListener("click", () => {
  fillAccountModal();
  openModal("settings-modal");
});

elements.menuLogout?.addEventListener("click", () => {
  closeProfileMenu();
  logout();
});

elements.accountCopyEmail?.addEventListener("click", async () => {
  if (!currentUser?.email) return;
  try {
    await navigator.clipboard.writeText(currentUser.email);
    elements.accountCopyEmail.textContent = "Көшірілді!";
    setTimeout(() => {
      elements.accountCopyEmail.textContent = "Email көшіру";
    }, 1500);
  } catch {
    /* ignore */
  }
});

elements.settingsClearChats?.addEventListener("click", async () => {
  closeModal("settings-modal");
  await deleteAllChats();
});

elements.settingsLogout?.addEventListener("click", () => {
  closeModal("settings-modal");
  logout();
});

elements.toggleEnterSend?.addEventListener("click", () => {
  settings.enterToSend = !settings.enterToSend;
  saveSettings();
});

elements.toggleEnterSend?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    settings.enterToSend = !settings.enterToSend;
    saveSettings();
  }
});

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.modal));
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener("click", (e) => {
  if (!profileMenuOpen) return;
  if (
    elements.profileFooter?.contains(e.target) ||
    elements.profileMenu?.contains(e.target)
  ) {
    return;
  }
  closeProfileMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllModals();
    closeProfileMenu();
  }
});

elements.newChatBtn.addEventListener("click", startNewChat);

elements.attachBtn?.addEventListener("click", () => {
  if (!isLoading) elements.imageInput?.click();
});

elements.imageInput?.addEventListener("change", () => {
  const file = elements.imageInput.files?.[0];
  if (file) handleImageFile(file);
});

elements.imagePreviewRemove?.addEventListener("click", clearPendingImage);

elements.sidebarOpen.addEventListener("click", openSidebar);

elements.sidebarClose.addEventListener("click", closeSidebar);

elements.sidebarOverlay.addEventListener("click", closeSidebar);



elements.starterCards.forEach((card) => {

  card.addEventListener("click", () => {

    const prompt = card.getAttribute("data-prompt");

    if (prompt) sendMessage(prompt);

  });

});



elements.authForm?.addEventListener("submit", handleAuthSubmit);

elements.authTabLogin?.addEventListener("click", () => setAuthMode("login"));

elements.authTabRegister?.addEventListener("click", () => setAuthMode("register"));

elements.logoutBtn?.addEventListener("click", logout);

elements.shareBtn?.addEventListener("click", async () => {
  const url = window.location.href;
  const notify = (msg) => {
    elements.errorBanner.textContent = msg;
    elements.errorBanner.className =
      "max-w-3xl mx-auto mb-2 px-4 py-2 text-sm text-emerald-100 bg-emerald-500/20 border border-emerald-400/30 rounded-xl backdrop-blur-sm";
    setTimeout(() => {
      hideError();
      elements.errorBanner.className =
        "hidden max-w-3xl mx-auto mb-2 px-4 py-2 text-sm text-red-200 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm";
    }, 2500);
  };
  try {
    if (navigator.share) {
      await navigator.share({ title: "Байеке ИИ", url });
    } else {
      await navigator.clipboard.writeText(url);
      notify("Ссылка көшірілді!");
    }
  } catch {
    try {
      await navigator.clipboard.writeText(url);
      notify("Ссылка көшірілді!");
    } catch {
      showError(url);
    }
  }
});



async function bootstrapApp() {

  await loadChatList();

  if (chats.length) {

    await selectChat(chats[0].id);

  } else {

    await startNewChat();

  }

  elements.messageInput.focus();

}



async function init() {

  loadSettings();

  setAuthMode("login");

  try {

    await loadHealth();

  } catch {

    if (elements.statusBadge) elements.statusBadge.textContent = "Бекенд қосылмаған";

    showError("Бекенд іске қосылмаған. backend/ папкасында npm start орындаңыз.");

    return;

  }

  if (!serverStatus?.auth) {

    showAuthOverlay();

    showAuthError("MongoDB қосылмаған. backend/.env → DATABASE_URL=mongodb://localhost:27017/bayeke");

    return;

  }

  const authed = await ensureAuthenticated();

  if (authed) {

    try {

      await bootstrapApp();

    } catch (err) {

      showError(err.message || "Чаттар жүктелмеді");

    }

  }

}



init();


