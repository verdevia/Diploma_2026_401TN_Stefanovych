const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const STORAGE_VERSION = "2026-05-26-ngrok-api-v2";
const STORAGE_VERSION_KEY = "c2c-marketplace-storage-version";
const TOKEN_KEY = "c2c-marketplace-token";
const USER_KEY = "c2c-marketplace-user";

function clearPersistentSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function resetStaleStorage() {
  if (localStorage.getItem(STORAGE_VERSION_KEY) === STORAGE_VERSION) {
    return;
  }

  clearPersistentSession();
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
}

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function readJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function readSession() {
  resetStaleStorage();
  clearPersistentSession();

  const token = sessionStorage.getItem(TOKEN_KEY);
  const user = readJson(sessionStorage.getItem(USER_KEY));

  if (!token || !user) {
    return null;
  }

  return { token, user };
}

export function persistSession(session) {
  clearPersistentSession();
  sessionStorage.setItem(TOKEN_KEY, session.token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  clearPersistentSession();
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const { body, token, ...requestOptions } = options;
  const activeToken = token ?? readSession()?.token;
  const headers = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    ...requestOptions.headers,
  };

  const response = await fetch(buildUrl(path), {
    ...requestOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? readJson(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || "Не вдалося виконати запит");
  }

  return data;
}

export const api = {
  auth: {
    signIn: (payload) => request("/auth/signin", { method: "POST", body: payload }),
    signUp: (payload) => request("/auth/signup", { method: "POST", body: payload }),
    requestSignUp: (payload) => request("/auth/signup/request", { method: "POST", body: payload }),
    confirmSignUp: (payload) => request("/auth/signup/confirm", { method: "POST", body: payload }),
  },
  ads: {
    list: (params) => request(`/listings${buildQuery(params)}`),
    get: (id) => request(`/listings/${id}`),
    create: (payload) => request("/listings", { method: "POST", body: payload }),
    update: (id, payload) => request(`/listings/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/listings/${id}`, { method: "DELETE" }),
  },
  categories: {
    list: () => request("/categories"),
    create: (payload) => request("/categories", { method: "POST", body: payload }),
    update: (id, payload) => request(`/categories/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/categories/${id}`, { method: "DELETE" }),
  },
  users: {
    list: () => request("/users"),
    me: () => request("/users/me"),
    updateMe: (payload) => request("/users/me", { method: "PATCH", body: payload }),
    requestEmailChange: (payload) => request("/users/me/email-verification", { method: "POST", body: payload }),
    changePassword: (payload) => request("/users/me/password", { method: "PATCH", body: payload }),
    get: (id) => request(`/users/${id}`),
    updateRole: (id, role) => request(`/users/${id}/role`, { method: "PATCH", body: { role } }),
    remove: (id) => request(`/users/${id}`, { method: "DELETE" }),
  },
  favorites: {
    list: () => request("/favorites"),
    add: (adId) => request(`/favorites/${adId}`, { method: "POST" }),
    remove: (adId) => request(`/favorites/${adId}`, { method: "DELETE" }),
  },
  messages: {
    list: () => request("/messages"),
    streamUrl: (token) => `${buildUrl("/messages/stream")}?token=${encodeURIComponent(token)}`,
    create: (payload) => request("/messages", { method: "POST", body: payload }),
    update: (id, payload) => request(`/messages/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/messages/${id}`, { method: "DELETE" }),
  },
  reviews: {
    list: (adId) => request(adId ? `/reviews?ad_id=${encodeURIComponent(adId)}` : "/reviews"),
    create: (payload) => request("/reviews", { method: "POST", body: payload }),
    update: (id, payload) => request(`/reviews/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/reviews/${id}`, { method: "DELETE" }),
  },
};
