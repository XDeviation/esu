import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
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
  const navigate = useNavigate();

  const checkAdminStatus = React.useCallback(async () => {
    console.log('AdminRoute - 开始检查权限状态...', { hasChecked, retryCount });
    
    if (hasChecked) {
      console.log('AdminRoute - 已经检查过权限，跳过');
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      console.log('AdminRoute - 当前token:', token);
      
      if (!token) {
        console.log('AdminRoute - 没有token，重定向到登录页');
        navigate('/login', { replace: true });
        return;
      }
      
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      console.log('AdminRoute - 权限检查响应:', response.data);
      
      if (response.data.is_admin || response.data.is_moderator) {
        console.log('AdminRoute - 用户具有权限:', {
          isAdmin: response.data.is_admin,
          isModerator: response.data.is_moderator
        });
        setIsAdmin(response.data.is_admin);
        setIsModerator(response.data.is_moderator);
        setHasChecked(true);
        setLoading(false);
      } else {
        console.log('AdminRoute - 用户没有权限，重定向到环境页面');
        navigate('/environments', { replace: true });
      }
    } catch (error: any) {
      console.error('AdminRoute - 权限检查失败:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          headers: error.config?.headers
        }
      });
      
      if (error.response?.status === 401) {
        console.log('AdminRoute - 遇到401错误，重定向到登录页');
        navigate('/login', { replace: true });
        return;
      }
      
      if (retryCount < 3) {
        console.log(`AdminRoute - 重试第${retryCount + 1}次...`);
        setRetryCount(prev => prev + 1);
        setTimeout(checkAdminStatus, 1000);
      } else {
        console.log('AdminRoute - 达到最大重试次数，重定向到环境页面');
        navigate('/environments', { replace: true });
      }
    }
  }, [retryCount, hasChecked, navigate]);

  React.useEffect(() => {
    console.log('AdminRoute - useEffect 触发');
    checkAdminStatus();
  }, [checkAdminStatus]);

  console.log('AdminRoute - 渲染状态:', { isAdmin, isModerator, loading, retryCount, hasChecked });

  if (loading) {
    console.log('AdminRoute - 显示加载状态');
    return <div>加载中...</div>;
  }

  if (!isAdmin && !isModerator) {
    console.log('AdminRoute - 权限不足，返回null');
    return null;
  }

  console.log('AdminRoute - 渲染子组件');
  return <>{children}</>;
};

const App: React.FC = () => {
  console.log('App - 渲染');
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
