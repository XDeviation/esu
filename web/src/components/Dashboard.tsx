import React from "react";
import { Layout, Menu, theme } from "antd";
import {
  EnvironmentOutlined,
  TrophyOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

const { Header, Content, Sider } = Layout;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/environments")) return "environments";
    if (path.includes("/decks")) return "decks";
    if (path.includes("/match-types")) return "match-types";
    if (path.includes("/match-results")) return "match-results";
    return "environments";
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          background: "#fff",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1 style={{ margin: 0, color: "#1890ff" }}>TCG 战绩管理器</h1>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: colorBgContainer }}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            style={{ height: "100%", borderRight: 0 }}
            items={[
              {
                key: "environments",
                icon: <EnvironmentOutlined />,
                label: "环境管理",
                onClick: () => navigate("/environments"),
              },
              {
                key: "decks",
                icon: <EnvironmentOutlined />,
                label: "卡组管理",
                onClick: () => navigate("/decks"),
              },
              {
                key: "match-types",
                icon: <TrophyOutlined />,
                label: "比赛类型",
                onClick: () => navigate("/match-types"),
              },
              {
                key: "match-results",
                icon: <HistoryOutlined />,
                label: "对局记录",
                onClick: () => navigate("/match-results"),
              },
            ]}
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
