import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  message,
  Space,
  Popconfirm,
  Select,
  Card,
  Row,
  Col,
  Radio,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import api, { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";

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
  }, [
    location.pathname,
    fetchMatchResults,
    fetchEnvironments,
    fetchDecks,
    fetchMatchTypes,
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
  }) => {
    try {
      const {
        environment_id,
        match_type_id,
        first_deck_id,
        second_deck_id,
        matches,
      } = values;
      const matchResults = matches.map((match) => {
        const winning_deck_id =
          match.win === "first" ? first_deck_id : second_deck_id;
        const losing_deck_id =
          match.win === "first" ? second_deck_id : first_deck_id;
        
        // 根据first_player决定先手和后手卡组
        const actual_first_deck_id = match.first_player === "first" ? first_deck_id : second_deck_id;
        const actual_second_deck_id = match.first_player === "first" ? second_deck_id : first_deck_id;
        
        return {
          environment_id,
          match_type_id,
          first_deck_id: actual_first_deck_id,
          second_deck_id: actual_second_deck_id,
          winning_deck_id,
          losing_deck_id,
        };
      });

      await api.post(`${API_ENDPOINTS.MATCH_RESULTS}batch/`, {
        match_results: matchResults,
      });
      message.success("添加成功");
      setBatchModalVisible(false);
      batchForm.resetFields();
      fetchMatchResults();
    } catch {
      message.error("添加失败");
    }
  };

  const handleAddBatchMatch = () => {
    const matches = batchForm.getFieldValue("matches") || [];
    batchForm.setFieldsValue({
      matches: [...matches, { first_player: "first", win: "first" }],
    });
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
      <Modal
        title="添加战绩"
        open={batchModalVisible}
        onOk={() => batchForm.submit()}
        onCancel={() => setBatchModalVisible(false)}
        destroyOnClose
        width={800}
      >
        <Form
          form={batchForm}
          layout="vertical"
          initialValues={{
            matches: [
              {
                first_player: "first",
                win: "first",
              },
            ],
          }}
          onFinish={handleBatchSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="match_type_id"
                label="比赛类型"
                rules={[{ required: true, message: "请选择比赛类型" }]}
              >
                <Select>
                  {matchTypes.map((type) => (
                    <Select.Option key={type.id} value={type.id}>
                      {type.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="first_deck_id"
                label="卡组1"
                rules={[{ required: true, message: "请选择卡组1" }]}
              >
                <Select>
                  {decks.map((deck) => (
                    <Select.Option key={deck.id} value={deck.id}>
                      {deck.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="second_deck_id"
                label="卡组2"
                rules={[{ required: true, message: "请选择卡组2" }]}
              >
                <Select>
                  {decks.map((deck) => (
                    <Select.Option key={deck.id} value={deck.id}>
                      {deck.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span>对战记录</span>
              <Button
                type="dashed"
                onClick={handleAddBatchMatch}
                icon={<PlusOutlined />}
              >
                添加对战
              </Button>
            </div>
            <Form.List name="matches">
              {(fields, { remove }) => (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {fields.map((field, index) => {
                    const firstDeckId =
                      batchForm.getFieldValue("first_deck_id");
                    const secondDeckId =
                      batchForm.getFieldValue("second_deck_id");
                    const firstDeck = decks.find((d) => d.id === firstDeckId);
                    const secondDeck = decks.find((d) => d.id === secondDeckId);
                    const firstDeckName = firstDeck
                      ? `${firstDeck.name} (${firstDeck.author_id})`
                      : "卡组1";
                    const secondDeckName = secondDeck
                      ? `${secondDeck.name} (${secondDeck.author_id})`
                      : "卡组2";

                    return (
                      <Card
                        key={`match-${field.key}`}
                        title={`对战 ${index + 1}`}
                        extra={
                          fields.length > 1 && (
                            <Button
                              type="link"
                              danger
                              onClick={() => remove(field.name)}
                            >
                              删除
                            </Button>
                          )
                        }
                      >
                        <Row gutter={16} align="middle">
                          <Col span={6}>
                            <div
                              style={{
                                textAlign: "center",
                                fontWeight: "bold",
                              }}
                            >
                              先手
                            </div>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              key={`first-${field.key}`}
                              name={[field.name, "first_player"]}
                              noStyle
                            >
                              <Radio.Group>
                                <Radio value="first">{firstDeckName}</Radio>
                                <Radio value="second">{secondDeckName}</Radio>
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <div
                              style={{
                                textAlign: "center",
                                fontWeight: "bold",
                              }}
                            >
                              胜利
                            </div>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              key={`win-${field.key}`}
                              name={[field.name, "win"]}
                              noStyle
                            >
                              <Radio.Group>
                                <Radio value="first">{firstDeckName}</Radio>
                                <Radio value="second">{secondDeckName}</Radio>
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Form.List>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchResults;
