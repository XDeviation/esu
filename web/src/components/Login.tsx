import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Tabs,
  Typography,
  Space,
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS } from "../config/api";

const { Title, Text } = Typography;

interface LoginFormData {
  username: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  name: string;
  password: string;
}

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);

  const onLoginFinish = async (values: LoginFormData) => {
    try {
      setLoading(true);
      const formData = new URLSearchParams();
      formData.append("username", values.username);
      formData.append("password", values.password);

      const response = await axios.post(API_ENDPOINTS.LOGIN, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: values.username,
          name: response.data.name || values.username,
        })
      );
      message.success("登录成功！");
      window.location.href = "/";
    } catch {
      message.error("登录失败，请检查用户名和密码！");
    } finally {
      setLoading(false);
    }
  };

  const onRegisterFinish = async (values: RegisterFormData) => {
    try {
      setLoading(true);
      await axios.post(API_ENDPOINTS.REGISTER, values);
      message.success("注册成功！请登录");
      setActiveTab("login");
    } catch (error) {
      if (error instanceof AxiosError) {
        message.error(error.response?.data?.detail || "注册失败，请稍后重试！");
      } else {
        message.error("注册失败，请稍后重试！");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
              欢迎使用
            </Title>
            <Text type="secondary">请登录或注册以继续</Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            items={[
              {
                key: "login",
                label: "登录",
                children: (
                  <Form
                    name="login"
                    onFinish={onLoginFinish}
                    layout="vertical"
                    size="large"
                  >
                    <Form.Item
                      name="username"
                      rules={[
                        { required: true, message: "请输入邮箱！" },
                        { type: "email", message: "请输入有效的邮箱地址！" },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: "请输入密码！" }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                        size="large"
                      >
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: "register",
                label: "注册",
                children: (
                  <Form
                    name="register"
                    onFinish={onRegisterFinish}
                    layout="vertical"
                    size="large"
                  >
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: "请输入邮箱！" },
                        { type: "email", message: "请输入有效的邮箱地址！" },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>

                    <Form.Item
                      name="name"
                      rules={[{ required: true, message: "请输入姓名！" }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="姓名" />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: "请输入密码！" },
                        { min: 6, message: "密码长度不能小于6位！" },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                        size="large"
                      >
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </Space>
      </Card>
    </div>
  );
};

export default Login;
