import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  message,
  Space,
  Popconfirm,
  Form,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import api, { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";
import BatchMatchModal from './BatchMatchModal';
import { handleBatchSubmit as submitBatchMatch } from '../utils/matchResults';

interface MatchResult {
  id: number;
  environment_id: number;
  match_type_id: number;
  first_deck_id: number;
  second_deck_id: number;
  first_player: "first" | "second";
  win: "first" | "second";
  created_at: string;
}

interface Environment {
  id: number;
  name: string;
}

interface Deck {
  id: number;
  name: string;
  author_id: string;
  environment_id: number;
}

interface MatchType {
  id: number;
  name: string;
}

interface BatchMatch {
  first_player: "first" | "second";
  win: "first" | "second";
}

const MatchResults: React.FC = () => {
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const location = useLocation();

  const fetchMatchResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.MATCH_RESULTS);
      const sortedData = response.data.sort((a: MatchResult, b: MatchResult) => b.id - a.id);
      setMatchResults(sortedData);
    } catch (error) {
      console.error("获取对局结果列表失败:", error);
      message.error("获取对局结果列表失败");
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

  const fetchDecks = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.DECKS);
      setDecks(response.data);
    } catch (error) {
      console.error("获取卡组列表失败:", error);
      message.error("获取卡组列表失败");
    }
  }, []);

  const fetchMatchTypes = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch (error) {
      console.error("获取比赛类型列表失败:", error);
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

    // 检查URL参数
    const params = new URLSearchParams(location.search);
    const openModal = params.get('open_modal');
    const firstDeckId = params.get('first_deck_id');
    const secondDeckId = params.get('second_deck_id');
    const environmentId = params.get('environment_id');
    const matchTypeId = params.get('match_type_id');

    if (openModal === 'true' && firstDeckId && secondDeckId) {
      // 设置表单数据
      batchForm.setFieldsValue({
        first_deck_id: firstDeckId,
        second_deck_id: secondDeckId,
        environment_id: environmentId,
        match_type_id: matchTypeId,
        matches: [{ first_player: "first", win: "first" }]
      });
      
      // 打开模态框
      setBatchModalVisible(true);
    }
  }, [
    location.pathname,
    fetchMatchResults,
    fetchEnvironments,
    fetchDecks,
    fetchMatchTypes,
    location.search,
    batchForm,
  ]);

  const handleEdit = (record: MatchResult) => {
    form.setFieldsValue(record);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.MATCH_RESULTS}${id}/`);
      message.success("删除成功");
      fetchMatchResults();
    } catch {
      message.error("删除失败");
    }
  };

  const handleBatchSubmit = async (values: {
    environment_id: number;
    match_type_id: number;
    first_deck_id: number;
    second_deck_id: number;
    matches: BatchMatch[];
    ignore_first_player: boolean;
  }) => {
    const success = await submitBatchMatch(values);
    if (success) {
      setBatchModalVisible(false);
      fetchMatchResults();
    }
  };

  const handleOpenBatchModal = () => {
    // 设置默认值为最新的环境和比赛类型
    if (environments.length > 0) {
      const latestEnv = environments[environments.length - 1];
      batchForm.setFieldValue("environment_id", latestEnv.id);
    }
    if (matchTypes.length > 0) {
      const latestMatchType = matchTypes[0];
      batchForm.setFieldValue("match_type_id", latestMatchType.id);
    }
    setBatchModalVisible(true);
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
        return deck ? `${deck.name} (${deck.author_id})` : id;
      },
    },
    {
      title: "后手卡组",
      dataIndex: "second_deck_id",
      key: "second_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? `${deck.name} (${deck.author_id})` : id;
      },
    },
    {
      title: "胜利卡组",
      dataIndex: "winning_deck_id",
      key: "winning_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? `${deck.name} (${deck.author_id})` : id;
      },
    },
    {
      title: "失败卡组",
      dataIndex: "losing_deck_id",
      key: "losing_deck_id",
      render: (id: number) => {
        const deck = decks.find((d) => d.id === id);
        return deck ? `${deck.name} (${deck.author_id})` : id;
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
        <Button type="primary" onClick={handleOpenBatchModal}>
          添加战绩
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={matchResults}
        rowKey="id"
        loading={loading}
      />
      <BatchMatchModal
        visible={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        onSubmit={handleBatchSubmit}
        environments={environments}
        decks={decks}
        matchTypes={matchTypes}
        initialValues={batchForm.getFieldsValue()}
      />
    </div>
  );
};

export default MatchResults;
