const SESSION_KEY = "bayeke-session-id";

const TOKEN_KEY = "bayeke-auth-token";



/** Бекенд URL: жергілікті dev (5173) → 3000, әйтпесе бір домен */

const API_BASE =

  window.BAYEKE_API_URL ||

  (window.location.port === "5173" ? "http://localhost:3000" : "");



export function getToken() {

  return localStorage.getItem(TOKEN_KEY);

}



export function setToken(token) {

  if (token) localStorage.setItem(TOKEN_KEY, token);

  else localStorage.removeItem(TOKEN_KEY);

}



export function clearAuth() {

  localStorage.removeItem(TOKEN_KEY);

}



function getSessionId() {

  let id = localStorage.getItem(SESSION_KEY);

  if (!id) {

    id = crypto.randomUUID();

    localStorage.setItem(SESSION_KEY, id);

  }

  return id;

}



async function request(path, options = {}) {

  const url = `${API_BASE}${path}`;

  const headers = {

    "Content-Type": "application/json",

    "X-Session-Id": getSessionId(),

    ...(options.headers || {}),

  };



  const token = getToken();

  if (token) {

    headers.Authorization = `Bearer ${token}`;

  }



  const response = await fetch(url, {

    ...options,

    headers,

    credentials: "include",

  });



  const data = await response.json().catch(() => ({}));



  if (!response.ok) {

    const error = new Error(data.error || data.details || "Сұрау сәтсіз");

    error.status = response.status;

    error.data = data;

    throw error;

  }



  return data;

}



export const api = {

  health() {

    return request("/api/health");

  },



  register(email, password, name) {

    return request("/api/auth/register", {

      method: "POST",

      body: JSON.stringify({ email, password, name }),

    });

  },



  login(email, password) {

    return request("/api/auth/login", {

      method: "POST",

      body: JSON.stringify({ email, password }),

    });

  },



  me() {

    return request("/api/auth/me");

  },



  listChats() {

    return request("/api/chats");

  },



  createChat(title) {

    return request("/api/chats", {

      method: "POST",

      body: JSON.stringify({ title }),

    });

  },



  getChat(id) {

    return request(`/api/chats/${id}`);

  },



  deleteChat(id) {

    return request(`/api/chats/${id}`, { method: "DELETE" });

  },



  renameChat(id, title) {

    return request(`/api/chats/${id}`, {

      method: "PATCH",

      body: JSON.stringify({ title }),

    });

  },



  sendMessage(chatId, message) {

    return request(`/api/chats/${chatId}/messages`, {

      method: "POST",

      body: JSON.stringify({ message }),

    });

  },

};


