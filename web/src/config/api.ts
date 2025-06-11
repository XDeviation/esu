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
  PRIOR_KNOWLEDGE: `${API_BASE_URL}/api/v1/prior-knowledge/matchup-priors`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/v1/token/refresh/`,
} as const;

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 是否正在刷新token
let isRefreshing = false;
// 重试队列
let retryQueue: ((token: string) => void)[] = [];

// 刷新token的函数
const refreshToken = async () => {
  try {
    const response = await axios.post(API_ENDPOINTS.REFRESH_TOKEN, {
      refresh: localStorage.getItem("refresh_token"),
    });
    const { access } = response.data;
    localStorage.setItem("token", access);
    return access;
  } catch (error) {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw error;
  }
};

// 处理重试队列
const processQueue = (token: string) => {
  retryQueue.forEach(callback => callback(token));
  retryQueue = [];
};

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
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");

      if (token === "guest") {
        return Promise.reject(error);
      }
      
      if (error.config?.url === API_ENDPOINTS.CHECK_ADMIN) {
        return Promise.reject(error);
      }

      // 如果不是刷新token的请求，尝试刷新token
      if (error.config?.url !== API_ENDPOINTS.REFRESH_TOKEN) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshToken();
            isRefreshing = false;
            processQueue(newToken);
            // 重试原始请求
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        } else {
          // 如果正在刷新token，将请求加入重试队列
          return new Promise((resolve) => {
            retryQueue.push((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            });
          });
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
