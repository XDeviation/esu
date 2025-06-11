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
    console.log('请求拦截器 - 当前token:', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('请求拦截器 - 设置Authorization头:', config.headers.Authorization);
    }
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('响应拦截器 - 成功响应:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      headers: response.headers,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error) => {
    console.error('响应拦截器 - 错误:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        method: error.config?.method,
        headers: error.config?.headers,
        baseURL: error.config?.baseURL
      },
      timestamp: new Date().toISOString()
    });

    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      console.log('响应拦截器 - 401错误处理:', {
        token: token ? '存在' : '不存在',
        user: user ? JSON.parse(user) : '不存在',
        isGuest: token === "guest",
        isCheckAdmin: error.config?.url === API_ENDPOINTS.CHECK_ADMIN,
        isPriorKnowledge: error.config?.url === API_ENDPOINTS.PRIOR_KNOWLEDGE,
        requestUrl: error.config?.url,
        timestamp: new Date().toISOString()
      });

      if (token === "guest") {
        console.log('游客token，不跳转', {
          timestamp: new Date().toISOString()
        });
        return Promise.reject(error);
      }
      
      if (error.config?.url === API_ENDPOINTS.CHECK_ADMIN) {
        console.log('权限检查接口401，让组件处理', {
          timestamp: new Date().toISOString()
        });
        return Promise.reject(error);
      }
      
      console.log('其他接口401，清除token并跳转', {
        requestUrl: error.config?.url,
        timestamp: new Date().toISOString()
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
