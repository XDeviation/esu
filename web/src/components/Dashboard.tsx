import React, { useState, useEffect } from "react";
import { Layout, Menu, theme, Space, Button, Typography, Drawer } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  TagsOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
  LoginOutlined,
  UserAddOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate('/login', { replace: true });
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  console.log("Current user:", user);
  const isGuest = user.name === "游客" || user.role === "guest";
  console.log("Is guest:", isGuest);

  // 检查管理员状态
  const checkAdminStatus = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      console.log('Dashboard - 权限检查响应:', response.data);
      setIsAdmin(response.data.is_admin);
      setIsModerator(response.data.is_moderator);
    } catch (error) {
      console.error('Dashboard - 权限检查失败:', error);
      setIsAdmin(false);
      setIsModerator(false);
    }
  };

  useEffect(() => {
    console.log('Dashboard - 组件挂载，检查权限');
    checkAdminStatus();
  }, []);

  // 监听路由变化
  useEffect(() => {
    console.log('Dashboard - 路由变化:', location.pathname);
  }, [location.pathname]);

  const menuItems = [
    ...(isAdmin || isModerator ? [{
      key: "admin",
      icon: <SettingOutlined />,
      label: "管理面板",
    }] : []),
    {
      key: "match-types",
      icon: <TagsOutlined />,
      label: "地区环境",
    },
    {
      key: "match-results",
      icon: <BarChartOutlined />,
      label: "对局记录",
    },
    {
      key: "statistics",
      icon: <LineChartOutlined />,
      label: "战绩统计",
    },
    {
      key: "deck-matchups",
      icon: <PieChartOutlined />,
      label: "优劣统计表",
    },
    {
      key: "win-rate-table",
      icon: <TableOutlined />,
      label: "梯度表（开发中）",
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    console.log('Dashboard - 菜单点击:', key);
    navigate(key);
    setDrawerVisible(false);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          padding: "0 16px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            style={{ display: "block", marginRight: 16 }}
            className="mobile-menu-button"
          />
          <h1 style={{ margin: 0, color: "#1890ff", fontSize: "1.2rem" }}>SVEC 战绩管理器</h1>
          <Text style={{ 
            fontSize: '12px',
            color: '#999',
            marginLeft: '8px'
          }}>
            v0611.1
          </Text>
        </div>
        <Space size="small">
          <Text style={{ 
            fontSize: '14px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <UserOutlined />
            <span className="user-name">{user.name || user.email}</span>
          </Text>
          {isGuest ? (
            <>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => window.location.href = "/login?tab=register"}
                style={{ 
                  padding: '4px 8px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className="register-text">注册</span>
              </Button>
              <Button
                type="default"
                icon={<LoginOutlined />}
                onClick={() => window.location.href = "/login"}
                style={{ 
                  padding: '4px 8px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className="login-text">登录</span>
              </Button>
            </>
          ) : (
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ 
                padding: '4px 8px',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span className="logout-text">登出</span>
            </Button>
          )}
        </Space>
      </Header>
      <Layout>
        <Sider
          width={200}
          style={{
            background: colorBgContainer,
            position: "fixed",
            height: "100vh",
            left: 0,
            top: 64,
            zIndex: 999,
          }}
          className="desktop-sider"
          breakpoint="lg"
          collapsedWidth="0"
          onBreakpoint={(broken) => {
            setCollapsed(broken);
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname.split("/")[1] || "environments"]}
            style={{ height: "100%", borderRight: 0 }}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
        <Layout style={{ marginLeft: collapsed ? 0 : 200, transition: "all 0.2s" }}>
          <Content
            style={{
              padding: "16px",
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        styles={{
          body: {
            padding: 0
          }
        }}
        width={200}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname.split("/")[1] || "environments"]}
          style={{ height: "100%", borderRight: 0 }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Drawer>
    </Layout>
  );
};

export default Dashboard;
