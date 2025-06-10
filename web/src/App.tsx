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

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
        setIsAdmin(response.data.is_admin);
        setIsModerator(response.data.is_moderator);
        setLoading(false);
      } catch (error: any) {
        console.error('权限检查失败:', error);
        // 如果是401错误，说明token可能过期，让响应拦截器处理
        if (error.response?.status === 401) {
          return;
        }
        // 其他错误，重试最多3次
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(checkAdminStatus, 1000); // 1秒后重试
        } else {
          setIsAdmin(false);
          setIsModerator(false);
          setLoading(false);
        }
      }
    };
    checkAdminStatus();
  }, [retryCount]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!isAdmin && !isModerator) {
    return <Navigate to="/environments" replace />;
  }

  return <>{children}</>;
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
