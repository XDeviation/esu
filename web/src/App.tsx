import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAdminStatus = React.useCallback(async () => {
    if (hasChecked) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      
      if (response.data.is_admin || response.data.is_moderator) {
        setIsAdmin(response.data.is_admin);
        setIsModerator(response.data.is_moderator);
        setHasChecked(true);
        setLoading(false);
      } else {
        navigate('/environments', { replace: true });
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(checkAdminStatus, 1000);
      } else {
        navigate('/environments', { replace: true });
      }
    }
  }, [hasChecked, retryCount, navigate]);

  React.useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  if (loading || !hasChecked) {
    return <div>加载中...</div>;
  }

  if (!isAdmin && !isModerator) {
    return null;
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
                <React.Suspense fallback={<div>加载中...</div>}>
                  <AdminRoute>
                    <PriorKnowledgeTable />
                  </AdminRoute>
                </React.Suspense>
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
