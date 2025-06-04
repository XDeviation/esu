import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/v1/token/`,
  REGISTER: `${API_BASE_URL}/api/v1/register/`,
  ENVIRONMENTS: `${API_BASE_URL}/api/v1/environments/`,
  DECKS: `${API_BASE_URL}/api/v1/decks/`,
  MATCH_TYPES: `${API_BASE_URL}/api/v1/match-types/`,
  MATCH_RESULTS: `${API_BASE_URL}/api/v1/match-results/`,
  USERS: `${API_BASE_URL}/api/v1/users/`,
  STATISTICS: `${API_BASE_URL}/api/v1/statistics`,
  DECK_MATCHUPS: `${API_BASE_URL}/api/v1/deck-matchups`,
  WIN_RATES: `${API_BASE_URL}/api/v1/win-rates`,
  CHECK_ADMIN: `${API_BASE_URL}/api/v1/check-admin`,
} as const;

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token === "guest") {
        // 如果是游客，不跳转到登录页
        return Promise.reject(error);
      }
      // 清除 token 并跳转到登录页
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
