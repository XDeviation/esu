import React from "react";
import { Layout, Menu, theme, Space, Button, Typography } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  EnvironmentOutlined,
  AppstoreOutlined,
  TagsOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const menuItems = [
    {
      key: "environments",
      icon: <EnvironmentOutlined />,
      label: "环境管理",
    },
    {
      key: "decks",
      icon: <AppstoreOutlined />,
      label: "卡组管理",
    },
    {
      key: "match-types",
      icon: <TagsOutlined />,
      label: "对局类型",
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
      label: "卡组对战",
    },
    {
      key: "win-rate-table",
      icon: <TableOutlined />,
      label: "梯度表（开发中）",
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1 style={{ margin: 0, color: "#1890ff" }}>SVEC 战绩管理器</h1>
        <Space>
          <Text>{user.name || user.email}</Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            登出
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: colorBgContainer }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname.split("/")[1] || "environments"]}
            style={{ height: "100%", borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout style={{ padding: "24px" }}>
          <Content
            style={{
              padding: 24,
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
    </Layout>
  );
};

export default Dashboard;
