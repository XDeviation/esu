import React, { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../config/api";
import {
  message,
  Select,
  Card,
  Table,
  Typography,
  Spin,
  Row,
  Col,
  Space,
  Tooltip,
} from "antd";
import api from "../config/api";
import { MatchType, BatchMatch } from "../types";
import type { ColumnsType } from "antd/es/table";
import BatchMatchModal from "./BatchMatchModal";
import { submitBatchMatch } from "../utils/matchUtils";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./DeckMatchups.css";

const { Title } = Typography;

interface Environment {
  id: number;
  name: string;
}

interface MatchupStats {
  wins: number;
  total: number;
  win_rate: number;
  first_hand_wins: number;
  first_hand_total: number;
  second_hand_wins: number;
  second_hand_total: number;
}

interface MatchupStatistics {
  matchup_statistics: {
    [key: string]: {
      deck_name: string;
      matchups: {
        [key: string]: MatchupStats;
      };
    };
  };
}

const DeckMatchups: React.FC = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedMatchType, setSelectedMatchType] = useState<string>("");
  const [selectedHand, setSelectedHand] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<MatchupStatistics | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchModalInitialValues, setBatchModalInitialValues] = useState<
    | {
        first_deck_id?: number;
        second_deck_id?: number;
        environment_id?: number;
        match_type_id?: number;
        ignore_first_player?: boolean;
      }
    | undefined
  >(undefined);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
      if (response.data.length > 0) {
        const latestEnv = response.data[response.data.length - 1];
        setSelectedEnvironment(latestEnv.id.toString());
      }
    } catch (error) {
      console.error("获取环境列表失败:", error);
      message.error("获取环境列表失败");
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

  const fetchStatistics = useCallback(async () => {
    if (!selectedEnvironment) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        environment_id: selectedEnvironment,
      });
      if (selectedMatchType) {
        params.append("match_type_id", selectedMatchType);
      }
      if (selectedHand && selectedHand !== "all") {
        params.append("hand", selectedHand);
      }
      const response = await api.get(
        `${API_ENDPOINTS.DECK_MATCHUPS}?${params.toString()}`
      );
      setStatistics(response.data);
    } catch (err) {
      console.error("获取统计数据失败", err);
      message.error("获取统计数据失败");
    } finally {
      setLoading(false);
    }
  }, [selectedEnvironment, selectedMatchType, selectedHand]);

  useEffect(() => {
    fetchEnvironments();
    fetchMatchTypes();
  }, [fetchEnvironments, fetchMatchTypes]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleCellClick = (rowDeckId: string, colDeckId: string) => {
    const initialValues = {
      environment_id: parseInt(selectedEnvironment),
      match_type_id: selectedMatchType
        ? parseInt(selectedMatchType)
        : undefined,
      first_deck_id: parseInt(rowDeckId),
      second_deck_id: parseInt(colDeckId),
      matches: [{ first_player: "first", win: "first" }],
    };

    setBatchModalInitialValues(initialValues);
    setBatchModalVisible(true);
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
      fetchStatistics();
    }
  };

  const getMatchupData = () => {
    if (!statistics) return [];

    const decks = Object.entries(statistics.matchup_statistics);
    return decks.map(([deckId, deck]) => {
      const rowData: Record<string, string | MatchupStats | null> = {
        key: deckId,
        deck_name: deck.deck_name,
      };

      decks.forEach(([opponentId]) => {
        rowData[opponentId] = deck.matchups[opponentId] || null;
      });

      return rowData;
    });
  };

  const getMatchupColumns = (): ColumnsType<
    Record<string, string | MatchupStats | null>
  > => {
    if (!statistics) return [];

    const columns: ColumnsType<Record<string, string | MatchupStats | null>> = [
      {
        title: "卡组",
        dataIndex: "deck_name",
        key: "deck_name",
        fixed: "left" as const,
        width: 100,
        ellipsis: true,
      },
    ];

    Object.entries(statistics.matchup_statistics).forEach(([deckId, deck]) => {
      columns.push({
        title: deck.deck_name,
        dataIndex: deckId,
        key: deckId,
        width: 100,
        ellipsis: true,
        render: (
          stats: MatchupStats | null,
          record: Record<string, string | MatchupStats | null>
        ) => {
          const rowDeckId = record.key as string;

          return (
            <div
              style={{
                cursor: "pointer",
                textAlign: "center",
                backgroundColor: stats
                  ? stats.win_rate > 50
                    ? "rgba(82, 196, 26, 0.1)"
                    : stats.win_rate < 50
                    ? "rgba(255, 77, 79, 0.1)"
                    : "transparent"
                  : "transparent",
                padding: "4px 0",
              }}
              onClick={() => handleCellClick(rowDeckId, deckId)}
            >
              {stats ? (
                selectedHand === "both" ? (
                  <div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      先: {stats.first_hand_wins}/{stats.first_hand_total}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      后: {stats.second_hand_wins}/{stats.second_hand_total}
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      {stats.win_rate.toFixed(1)}%
                    </div>
                  </div>
                ) : (
                  <>
                    <div>{stats.win_rate.toFixed(1)}%</div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      {stats.wins}/{stats.total}
                    </div>
                  </>
                )
              ) : (
                <div style={{ color: "#999" }}>-</div>
              )}
            </div>
          );
        },
      });
    });

    return columns;
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <Row gutter={[16, 16]} justify="center">
          <Col xs={24} sm={24} md={24} lg={24}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row justify="center">
                <Space align="center">
                  <Title level={2} style={{ margin: 0 }}>
                    卡组优劣统计表
                  </Title>
                  <Tooltip title="点击单元格快速提交对局记录">
                    <QuestionCircleOutlined style={{ fontSize: '20px', color: '#1890ff', cursor: 'help' }} />
                  </Tooltip>
                </Space>
              </Row>
              <Row gutter={[16, 16]} justify="center">
                <Col xs={24} sm={12} md={8}>
                  <Select
                    value={selectedEnvironment}
                    onChange={(value) => setSelectedEnvironment(value)}
                    className="select-container"
                    loading={loading}
                    placeholder="请选择环境"
                  >
                    {environments.map((env) => (
                      <Select.Option key={env.id} value={env.id.toString()}>
                        {env.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    value={selectedMatchType}
                    onChange={(value) => setSelectedMatchType(value)}
                    className="select-container"
                    loading={loading}
                    placeholder="请选择比赛类型"
                    allowClear
                  >
                    <Select.Option value="">全部</Select.Option>
                    {matchTypes.map((mt) => (
                      <Select.Option key={mt.id} value={mt.id.toString()}>
                        {mt.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    value={selectedHand}
                    onChange={(value) => setSelectedHand(value)}
                    className="select-container"
                    placeholder="请选择先后手"
                  >
                    <Select.Option value="all">默认</Select.Option>
                    <Select.Option value="both">显示先后手</Select.Option>
                    <Select.Option value="first">仅先手</Select.Option>
                    <Select.Option value="second">仅后手</Select.Option>
                  </Select>
                </Col>
              </Row>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {statistics && (
            <Table
              dataSource={getMatchupData()}
              columns={getMatchupColumns()}
              pagination={false}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          )}
        </Spin>
      </Card>

      <BatchMatchModal
        visible={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        onSubmit={handleBatchSubmit}
        initialValues={batchModalInitialValues}
        environments={environments}
        decks={Object.entries(statistics?.matchup_statistics || {}).map(
          ([id, deck]) => ({
            id: parseInt(id),
            name: deck.deck_name,
            environment_id: parseInt(selectedEnvironment),
            author_id: "",
          })
        )}
        matchTypes={matchTypes}
      />
    </div>
  );
};

export default DeckMatchups;
