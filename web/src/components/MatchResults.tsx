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
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";

interface MatchResult {
  id: number;
  environment_id: number;
  first_deck_id: number;
  second_deck_id: number;
  winning_deck_id: number;
  losing_deck_id: number;
  match_type_id: number;
}

interface Environment {
  id: number;
  name: string;
}

interface Deck {
  id: number;
  name: string;
  environment_id: number;
}

interface MatchType {
  id: number;
  name: string;
}

const MatchResults: React.FC = () => {
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMatchResult, setEditingMatchResult] =
    useState<MatchResult | null>(null);
  const [form] = Form.useForm();
  const location = useLocation();

  const fetchMatchResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.MATCH_RESULTS);
      setMatchResults(response.data);
    } catch {
      message.error("获取对局结果列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
    } catch {
      message.error("获取环境列表失败");
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.DECKS);
      setDecks(response.data);
    } catch {
      message.error("获取卡组列表失败");
    }
  }, []);

  const fetchMatchTypes = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch {
      message.error("获取比赛类型列表失败");
    }
  }, []);

  // 监听路由变化
  useEffect(() => {
    if (location.pathname === "/match-results") {
      fetchMatchResults();
      fetchEnvironments();
      fetchDecks();
      fetchMatchTypes();
    }
  }, [
    location.pathname,
    fetchMatchResults,
    fetchEnvironments,
    fetchDecks,
    fetchMatchTypes,
  ]);

  const handleCreate = () => {
    setEditingMatchResult(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: MatchResult) => {
    setEditingMatchResult(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.MATCH_RESULTS}/${id}`);
      message.success("删除成功");
      fetchMatchResults();
    } catch {
      message.error("删除失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingMatchResult) {
        await api.put(
          `${API_ENDPOINTS.MATCH_RESULTS}/${editingMatchResult.id}`,
          values
        );
        message.success("更新成功");
      } else {
        await api.post(API_ENDPOINTS.MATCH_RESULTS, values);
        message.success("创建成功");
      }
      setModalVisible(false);
      fetchMatchResults();
    } catch {
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
      title: "环境",
      dataIndex: "environment_id",
      key: "environment_id",
      render: (id: number) => {
        const environment = environments.find((env) => env.id === id);
        return environment ? environment.name : id;
      },
    },
    {
      title: "先手卡组",
      dataIndex: "first_deck_id",
      key: "first_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? deck.name : id;
      },
    },
    {
      title: "后手卡组",
      dataIndex: "second_deck_id",
      key: "second_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? deck.name : id;
      },
    },
    {
      title: "胜利卡组",
      dataIndex: "winning_deck_id",
      key: "winning_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? deck.name : id;
      },
    },
    {
      title: "失败卡组",
      dataIndex: "losing_deck_id",
      key: "losing_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? deck.name : id;
      },
    },
    {
      title: "比赛类型",
      dataIndex: "match_type_id",
      key: "match_type_id",
      render: (id: number) => {
        const matchType = matchTypes.find((mt) => mt.id === id);
        return matchType ? matchType.name : id;
      },
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: MatchResult) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个对局结果吗？"
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
          创建对局结果
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={matchResults}
        rowKey="id"
        loading={loading}
      />
      <Modal
        title={editingMatchResult ? "编辑对局结果" : "创建对局结果"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
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
            name="first_deck_id"
            label="先手卡组"
            rules={[{ required: true, message: "请选择先手卡组" }]}
          >
            <Select>
              {decks.map((deck) => (
                <Select.Option key={deck.id} value={deck.id}>
                  {deck.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="second_deck_id"
            label="后手卡组"
            rules={[{ required: true, message: "请选择后手卡组" }]}
          >
            <Select>
              {decks.map((deck) => (
                <Select.Option key={deck.id} value={deck.id}>
                  {deck.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="winning_deck_id"
            label="胜利卡组"
            rules={[{ required: true, message: "请选择胜利卡组" }]}
          >
            <Select>
              {decks.map((deck) => (
                <Select.Option key={deck.id} value={deck.id}>
                  {deck.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="losing_deck_id"
            label="失败卡组"
            rules={[{ required: true, message: "请选择失败卡组" }]}
          >
            <Select>
              {decks.map((deck) => (
                <Select.Option key={deck.id} value={deck.id}>
                  {deck.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="match_type_id"
            label="比赛类型"
            rules={[{ required: true, message: "请选择比赛类型" }]}
          >
            <Select>
              {matchTypes.map((mt) => (
                <Select.Option key={mt.id} value={mt.id}>
                  {mt.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchResults;
