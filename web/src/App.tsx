import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { App as AntApp } from "antd";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Environments from "./components/Environments";
import Decks from "./components/Decks";
import MatchTypes from "./components/MatchTypes";
import MatchResults from "./components/MatchResults";
import Statistics from "./components/Statistics";
import DeckMatchups from "./components/DeckMatchups";
import WinRateTable from "./components/WinRateTable";
import PriorKnowledgeTable from './components/PriorKnowledgeTable';
import api from "./config/api";
import { API_ENDPOINTS } from "./config/api";
import "./App.css";

// 添加权限检查组件
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isModerator, setIsModerator] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [retryCount, setRetryCount] = React.useState(0);
  const [hasChecked, setHasChecked] = React.useState(false);

  const checkAdminStatus = React.useCallback(async () => {
    if (hasChecked) return;
    
    console.log('开始检查权限状态...');
    try {
      const token = localStorage.getItem("token");
      console.log('当前token:', token);
      
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      console.log('权限检查响应:', response.data);
      
      setIsAdmin(response.data.is_admin);
      setIsModerator(response.data.is_moderator);
      setHasChecked(true);
      setLoading(false);
    } catch (error: any) {
      console.error('权限检查失败:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          headers: error.config?.headers
        }
      });
      
      // 如果是401错误，说明token可能过期，让响应拦截器处理
      if (error.response?.status === 401) {
        console.log('遇到401错误，等待响应拦截器处理');
        return;
      }
      // 其他错误，重试最多3次
      if (retryCount < 3) {
        console.log(`重试第${retryCount + 1}次...`);
        setRetryCount(prev => prev + 1);
        setTimeout(checkAdminStatus, 1000); // 1秒后重试
      } else {
        console.log('达到最大重试次数，设置权限为false');
        setIsAdmin(false);
        setIsModerator(false);
        setHasChecked(true);
        setLoading(false);
      }
    }
  }, [retryCount, hasChecked]);

  React.useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const shouldRender = React.useMemo(() => {
    console.log('当前权限状态:', { isAdmin, isModerator, loading, retryCount, hasChecked });
    
    if (loading) {
      return <div>加载中...</div>;
    }

    if (!isAdmin && !isModerator) {
      console.log('权限不足，重定向到环境页面');
      return <Navigate to="/environments" replace />;
    }

    return <>{children}</>;
  }, [isAdmin, isModerator, loading, retryCount, hasChecked, children]);

  return shouldRender;
};

const App: React.FC = () => {
  return (
    <AntApp>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />}>
            <Route path="environments" element={<Environments />} />
            <Route path="decks" element={<Decks />} />
            <Route path="match-types" element={<MatchTypes />} />
            <Route path="match-results" element={<MatchResults />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="deck-matchups" element={<DeckMatchups />} />
            <Route path="win-rate-table" element={<WinRateTable />} />
            <Route 
              path="prior-knowledge" 
              element={
                <AdminRoute>
                  <PriorKnowledgeTable />
                </AdminRoute>
              } 
            />
            <Route index element={<Navigate to="environments" replace />} />
          </Route>
        </Routes>
      </Router>
    </AntApp>
  );
};

export default App;
