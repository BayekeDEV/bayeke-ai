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

  userInfo: document.getElementById("user-info"),

};



let chats = [];

let activeChat = null;

let isLoading = false;

let serverStatus = null;

let currentUser = null;

let authMode = "login";



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

  elements.submitBtn.disabled = !hasText || isLoading;

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

    serverStatus.gemini === "configured" ? "ИИ дайын" : "ИИ кілті жоқ";



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
    "auth-tab flex-1 py-2 text-sm font-medium rounded-md transition-colors",
    isRegister
      ? "text-ink-muted hover:text-ink-soft"
      : "bg-cream text-ink shadow-sm",
  ].join(" ");

  elements.authTabRegister.className = [
    "auth-tab flex-1 py-2 text-sm font-medium rounded-md transition-colors",
    isRegister
      ? "bg-cream text-ink shadow-sm"
      : "text-ink-muted hover:text-ink-soft",
  ].join(" ");



  hideAuthError();

}



function updateUserUI() {

  if (currentUser) {

    elements.userInfo?.classList.remove("hidden");

    elements.logoutBtn?.classList.remove("hidden");

    if (elements.userInfo) {

      elements.userInfo.textContent = currentUser.email;

    }

    hideAuthOverlay();

  } else {

    elements.userInfo?.classList.add("hidden");

    elements.logoutBtn?.classList.add("hidden");

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

  wrapper.className = `flex gap-3 ${isUser ? "flex-row-reverse" : ""}`;



  const avatar = document.createElement("div");

  avatar.className = [
    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-xs font-semibold border",
    isUser
      ? "bg-sage-muted/80 text-sage border-sage/30"
      : "bg-sky-soft/60 text-sky-700 border-sky-soft/50",
  ].join(" ");

  avatar.textContent = isUser ? "Сіз" : "БИ";



  const bubble = document.createElement("div");

  bubble.className = [
    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
    isUser ? "bubble-user rounded-br-md" : "bubble-assistant rounded-bl-md",
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

    contentEl.innerHTML = formatMessageHtml(content);

    bubble.appendChild(contentEl);

  }



  wrapper.appendChild(avatar);

  wrapper.appendChild(bubble);

  return wrapper;

}



function renderHistory() {

  elements.chatHistory.innerHTML = "";



  if (!chats.length) {

    elements.chatHistory.innerHTML =

      '<p class="px-3 py-2 text-xs text-ink-muted">Әлі чат жоқ</p>';

    return;

  }



  chats.forEach((chat) => {

    const row = document.createElement("div");

    row.className = "group flex items-center gap-1";



    const btn = document.createElement("button");

    btn.type = "button";

    btn.className = [
      "flex-1 text-left px-3 py-2.5 rounded-lg text-sm truncate transition-colors",
      activeChat?.id === chat.id
        ? "bg-cream/80 text-ink border border-copper/30 shadow-sm"
        : "text-ink-muted hover:bg-cream/50 hover:text-ink-soft",
    ].join(" ");

    btn.textContent = chat.title || "Жаңа сөйлесу";

    btn.title = chat.title;

    btn.addEventListener("click", () => selectChat(chat.id));



    const delBtn = document.createElement("button");

    delBtn.type = "button";

    delBtn.className =
      "opacity-0 group-hover:opacity-100 p-2 rounded-lg text-ink-muted hover:text-red-600 hover:bg-cream/60 shrink-0 transition-opacity";

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

    elements.chatTitle.textContent = activeChat?.title || "Жаңа сөйлесу";

    return;

  }



  elements.welcomeScreen.classList.add("hidden");

  elements.messagesList.classList.remove("hidden");

  elements.messagesList.innerHTML = "";

  elements.chatTitle.textContent = activeChat?.title || "Жаңа сөйлесу";



  messages.forEach((msg) => {

    elements.messagesList.appendChild(

      createMessageElement(msg.role, msg.content)

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

  if (!trimmed || isLoading) return;



  hideError();

  const chat = await ensureActiveChat();



  if (!chat.messages) chat.messages = [];



  chat.messages.push({ role: "user", content: trimmed });

  isLoading = true;

  updateSubmitState();

  render();



  elements.messageInput.value = "";

  autoResizeInput();



  try {

    const data = await api.sendMessage(chat.id, trimmed);

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

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    if (!elements.submitBtn.disabled) {

      sendMessage(elements.messageInput.value);

    }

  }

});



elements.newChatBtn.addEventListener("click", startNewChat);

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


