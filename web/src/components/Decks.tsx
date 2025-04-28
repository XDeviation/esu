import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Popconfirm,
  Select,
  Card,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";

const { TextArea } = Input;
const { Text } = Typography;

interface Card {
  name: string;
  count: number;
}

interface Deck {
  id: number;
  name: string;
  environment_id: number;
  author_id: string;
  description?: string;
  composition?: Card[];
  deck_code?: string;
}

interface Environment {
  id: number;
  name: string;
}

const Decks: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [form] = Form.useForm();
  const location = useLocation();

  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.DECKS);
      setDecks(response.data);
    } catch (error) {
      console.error("获取卡组列表失败:", error);
      message.error("获取卡组列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
    } catch (error) {
      console.error("获取环境列表失败:", error);
      message.error("获取环境列表失败");
    }
  }, []);

  // 监听路由变化
  useEffect(() => {
    if (location.pathname === "/decks") {
      fetchDecks();
      fetchEnvironments();
    }
  }, [location.pathname, fetchDecks, fetchEnvironments]);

  const handleCreate = () => {
    setEditingDeck(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Deck) => {
    setEditingDeck(record);
    form.setFieldsValue({
      ...record,
      composition: record.composition
        ? JSON.stringify(record.composition, null, 2)
        : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.DECKS}${id}/`);
      message.success("删除成功");
      fetchDecks();
    } catch (error) {
      console.error("删除失败:", error);
      message.error("删除失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log("表单值:", values);

      // 处理卡组构成
      if (values.composition) {
        try {
          values.composition = JSON.parse(values.composition);
        } catch (error) {
          console.error("JSON 解析错误:", error);
          message.error("卡组构成格式错误，请检查 JSON 格式");
          return;
        }
      }

      // 获取当前用户信息
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        message.error("请先登录");
        return;
      }

      console.log("提交数据:", values);

      if (editingDeck) {
        const response = await api.put(
          `${API_ENDPOINTS.DECKS}${editingDeck.id}/`,
          values
        );
        console.log("更新响应:", response);
        message.success("更新成功");
      } else {
        const response = await api.post(API_ENDPOINTS.DECKS, values);
        console.log("创建响应:", response);
        message.success("创建成功");
      }
      setModalVisible(false);
      fetchDecks();
    } catch (error) {
      console.error("操作失败:", error);
      message.error("操作失败");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "卡组名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "环境",
      dataIndex: "environment_id",
      key: "environment_id",
      render: (id: number) => {
        const environment = environments.find((env) => env.id === id);
        return environment ? environment.name : id;
      },
    },
    {
      title: "作者",
      dataIndex: "author_id",
      key: "author_id",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "卡组码",
      dataIndex: "deck_code",
      key: "deck_code",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: Deck) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个卡组吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建卡组
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={decks}
        rowKey="id"
        loading={loading}
      />
      <Modal
        title={editingDeck ? "编辑卡组" : "创建卡组"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="卡组名称"
            rules={[{ required: true, message: "请输入卡组名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="environment_id"
            label="环境"
            rules={[{ required: true, message: "请选择环境" }]}
          >
            <Select>
              {environments.map((env) => (
                <Select.Option key={env.id} value={env.id}>
                  {env.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="author_id"
            label="作者"
            rules={[{ required: true, message: "请输入作者" }]}
          >
            <Input placeholder="请输入作者邮箱" />
          </Form.Item>
          <Form.Item
            name="composition"
            label={
              <Space>
                <span>卡组构成</span>
                <Text type="secondary" style={{ fontSize: 12 }}></Text>
              </Space>
            }
          >
            <TextArea
              rows={6}
              placeholder="请输入卡组构成（模拟器JSON）"
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>
          <Form.Item name="deck_code" label="卡组码">
            <Input placeholder="请输入卡组码" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={4} placeholder="请输入卡组描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Decks;
