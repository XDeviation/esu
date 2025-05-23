import React from "react";
import { Layout, Menu, theme } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  EnvironmentOutlined,
  AppstoreOutlined,
  TagsOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
} from "@ant-design/icons";

const { Header, Content, Sider } = Layout;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: "environments",
      icon: <EnvironmentOutlined />,
      label: "卡包环境",
    },
    {
      key: "decks",
      icon: <AppstoreOutlined />,
      label: "卡组管理",
    },
    {
      key: "match-types",
      icon: <TagsOutlined />,
      label: "地区环境",
    },
    {
      key: "match-results",
      icon: <BarChartOutlined />,
      label: "战绩查询",
    },
    {
      key: "statistics",
      icon: <LineChartOutlined />,
      label: "战绩统计",
    },
    {
      key: "deck-matchups",
      icon: <PieChartOutlined />,
      label: "战绩总表",
    },
    {
      key: "win-rate-table",
      icon: <TableOutlined />,
      label: "梯度表",
    },
  ];

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
        <h1 style={{ margin: 0, color: "#1890ff" }}>SVEC 战绩管理器</h1>
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
