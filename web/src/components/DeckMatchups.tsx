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
  Form,
} from "antd";
import api from "../config/api";
import { useLocation } from "react-router-dom";
import { MatchType, BatchMatch } from "../types";
import type { ColumnsType } from "antd/es/table";
import BatchMatchModal from "./BatchMatchModal";
import { submitBatchMatch } from "../utils/matchUtils";

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
  const [batchModalInitialValues, setBatchModalInitialValues] = useState<any>(null);
  const [batchForm] = Form.useForm();

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
      match_type_id: selectedMatchType ? parseInt(selectedMatchType) : undefined,
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

  const getMatchupColumns = (): ColumnsType<Record<string, string | MatchupStats | null>> => {
    if (!statistics) return [];

    const columns: ColumnsType<Record<string, string | MatchupStats | null>> = [
      {
        title: "卡组",
        dataIndex: "deck_name",
        key: "deck_name",
        fixed: "left" as const,
        width: 200,
      },
    ];

    Object.entries(statistics.matchup_statistics).forEach(([deckId, deck]) => {
      columns.push({
        title: deck.deck_name,
        dataIndex: deckId,
        key: deckId,
        width: 150,
        render: (stats: MatchupStats | null, record: Record<string, string | MatchupStats | null>) => {
          const rowDeckId = record.key as string;
          const rowDeck = statistics.matchup_statistics[rowDeckId];
          const colDeck = statistics.matchup_statistics[deckId];
          
          return (
            <div
              style={{ 
                cursor: "pointer",
                textAlign: "center",
                backgroundColor: stats ? (stats.win_rate > 50 
                  ? "rgba(82, 196, 26, 0.1)" 
                  : stats.win_rate < 50 
                    ? "rgba(255, 77, 79, 0.1)" 
                    : "transparent") : "transparent",
                padding: "4px 0",
              }}
              onClick={() => handleCellClick(rowDeckId, deckId)}
            >
              {stats ? (
                selectedHand === "both" ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px" }}>
                    <div style={{ flex: 1, borderRight: "1px solid #f0f0f0", paddingRight: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>先手</div>
                      <div>
                        {stats.first_hand_total > 0 
                          ? ((stats.first_hand_wins / stats.first_hand_total) * 100).toFixed(1)
                          : "0.0"}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#999" }}>
                        {stats.first_hand_wins}/{stats.first_hand_total}
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>后手</div>
                      <div>
                        {stats.second_hand_total > 0 
                          ? ((stats.second_hand_wins / stats.second_hand_total) * 100).toFixed(1)
                          : "0.0"}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#999" }}>
                        {stats.second_hand_wins}/{stats.second_hand_total}
                      </div>
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
        <Row justify="center">
          <Col>
            <Space size="large" align="center">
              <Title level={2} style={{ margin: 0 }}>
                卡组对战统计
              </Title>
              <Select
                value={selectedEnvironment}
                onChange={(value) => setSelectedEnvironment(value)}
                style={{ width: 200 }}
                loading={loading}
                placeholder="请选择环境"
              >
                {environments.map((env) => (
                  <Select.Option key={env.id} value={env.id.toString()}>
                    {env.name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                value={selectedMatchType}
                onChange={(value) => setSelectedMatchType(value)}
                style={{ width: 200 }}
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
              <Select
                value={selectedHand}
                onChange={(value) => setSelectedHand(value)}
                style={{ width: 120 }}
                placeholder="请选择先后手"
              >
                <Select.Option value="all">默认</Select.Option>
                <Select.Option value="both">显示先后手</Select.Option>
                <Select.Option value="first">仅先手</Select.Option>
                <Select.Option value="second">仅后手</Select.Option>
              </Select>
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
              scroll={{ x: "max-content" }}
            />
          )}
        </Spin>
      </Card>
      <BatchMatchModal
        visible={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          setBatchModalInitialValues(null);
        }}
        onSubmit={handleBatchSubmit}
        environments={environments}
        decks={Object.entries(statistics?.matchup_statistics || {}).map(([id, deck]) => ({
          id: parseInt(id),
          name: deck.deck_name,
          environment_id: parseInt(selectedEnvironment),
          author_id: "",
        }))}
        matchTypes={matchTypes}
        initialValues={batchModalInitialValues}
      />
    </div>
  );
};

export default DeckMatchups;
