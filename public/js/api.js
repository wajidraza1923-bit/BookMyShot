/**
 * BookMyShot API Client
 */
const API = {
  base: "https://site--bookmyshot--ykz2mr8mzlrv.code.run",

  getToken() {
    return localStorage.getItem("bms_token");
  },

  setAuth(token, user) {
    localStorage.setItem("bms_token", token);
    localStorage.setItem("bms_user", JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem("bms_token");
    localStorage.removeItem("bms_user");
  },

  getUser() {
    const u = localStorage.getItem("bms_user");
    return u ? JSON.parse(u) : null;
  },

  async request(url, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const maxAttempts = options.retries || 2;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const res = await fetch(`${this.base}/api${url}`, { ...options, headers });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const err = new Error(data.message || `Request failed (${res.status})`);
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      } catch (error) {
        attempt += 1;
        if (attempt >= maxAttempts || !/failed|network|timeout/i.test(error.message || "")) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  },

  get: (url) => API.request(url),
  post: (url, body) => API.request(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) => API.request(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: (url, body) => API.request(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (url) => API.request(url, { method: "DELETE" }),

  async upload(url, formData) {
    const token = this.getToken();
    const res = await fetch(`${this.base}/api${url}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data;
  },
};
