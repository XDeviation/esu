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
} from "antd";
import api from "../config/api";
import { useLocation } from "react-router-dom";
import { MatchType } from "../types";
import type { ColumnsType } from "antd/es/table";

const { Title } = Typography;

interface Environment {
  id: number;
  name: string;
}

interface MatchupStats {
  opponent_name: string;
  total: number;
  wins: number;
  losses: number;
  win_rate: number;
  first_hand_total: number;
  first_hand_wins: number;
  second_hand_total: number;
  second_hand_wins: number;
}

interface DeckMatchups {
  deck_name: string;
  matchups: { [key: string]: MatchupStats };
}

interface MatchupStatistics {
  environment_id: number;
  environment_name: string;
  matchup_statistics: { [key: string]: DeckMatchups };
}

const DeckMatchups: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedMatchType, setSelectedMatchType] = useState<string>("");
  const [selectedHand, setSelectedHand] = useState<string>("all");
  const [statistics, setStatistics] = useState<MatchupStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const location = useLocation();

  const fetchEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
      if (response.data.length > 0) {
        const latestEnv = response.data[response.data.length - 1];
        setSelectedEnvironment(latestEnv.id.toString());
      }
    } catch {
      message.error("获取环境列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMatchTypes = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch (error) {
      console.error("获取比赛类型列表失败", error);
    }
  };

  useEffect(() => {
    if (location.pathname === "/deck-matchups") {
      fetchEnvironments();
      fetchMatchTypes();
    }
  }, [location.pathname, fetchEnvironments]);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!selectedEnvironment) return;

      setLoading(true);
      try {
        const params = new URLSearchParams({
          environment_id: selectedEnvironment,
        });
        if (selectedMatchType) {
          params.append("match_type_id", selectedMatchType);
        }
        const response = await api.get(
          `${API_ENDPOINTS.DECK_MATCHUPS}?${params.toString()}`
        );
        setStatistics(response.data);
      } catch (err) {
        console.error("获取对战数据失败", err);
        message.error("获取对战数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedEnvironment, selectedMatchType]);

  const getMatchupColumns = (): ColumnsType<
    Record<string, string | MatchupStats | null>
  > => {
    const columns: ColumnsType<Record<string, string | MatchupStats | null>> = [
      {
        title: "卡组",
        dataIndex: "deck_name",
        key: "deck_name",
        fixed: "left" as const,
        width: 150,
      },
    ];

    // 为每个卡组添加一列
    if (!statistics) return columns;

    const decks = Object.entries(statistics.matchup_statistics);
    decks.forEach(([deckId, deck]) => {
      columns.push({
        title: deck.deck_name,
        dataIndex: deckId,
        key: deckId,
        width: 150,
        render: (value: MatchupStats | null) => {
          if (!value) return "-";

          if (selectedHand === "both") {
            const firstHandWinRate =
              value.first_hand_wins && value.first_hand_total
                ? (value.first_hand_wins / value.first_hand_total) * 100
                : 0;
            const secondHandWinRate =
              value.second_hand_wins && value.second_hand_total
                ? (value.second_hand_wins / value.second_hand_total) * 100
                : 0;

            const totalWinRate = value.win_rate;
            const backgroundColor =
              totalWinRate > 50
                ? "rgba(82, 196, 26, 0.1)"
                : totalWinRate < 50
                ? "rgba(255, 77, 79, 0.1)"
                : "transparent";

            return (
              <div
                style={{
                  textAlign: "center",
                  backgroundColor,
                  padding: "4px 0",
                }}
              >
                <div>{totalWinRate.toFixed(1)}%</div>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {value.wins}/{value.total}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  <div>
                    先手: {firstHandWinRate.toFixed(1)}%
                    <br />
                    {value.first_hand_wins || 0}/{value.first_hand_total || 0}
                  </div>
                  <div>
                    后手: {secondHandWinRate.toFixed(1)}%
                    <br />
                    {value.second_hand_wins || 0}/{value.second_hand_total || 0}
                  </div>
                </div>
              </div>
            );
          } else {
            let displayStats = value;
            if (selectedHand === "first" && value.first_hand_total) {
              displayStats = {
                ...value,
                total: value.first_hand_total,
                wins: value.first_hand_wins || 0,
                win_rate: value.first_hand_wins
                  ? (value.first_hand_wins / value.first_hand_total) * 100
                  : 0,
              };
            } else if (selectedHand === "second" && value.second_hand_total) {
              displayStats = {
                ...value,
                total: value.second_hand_total,
                wins: value.second_hand_wins || 0,
                win_rate: value.second_hand_wins
                  ? (value.second_hand_wins / value.second_hand_total) * 100
                  : 0,
              };
            }

            const backgroundColor =
              displayStats.win_rate > 50
                ? "rgba(82, 196, 26, 0.1)"
                : displayStats.win_rate < 50
                ? "rgba(255, 77, 79, 0.1)"
                : "transparent";

            return (
              <div
                style={{
                  textAlign: "center",
                  backgroundColor,
                  padding: "4px 0",
                }}
              >
                <div>{displayStats.win_rate.toFixed(1)}%</div>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {displayStats.wins}/{displayStats.total}
                </div>
              </div>
            );
          }
        },
      });
    });

    return columns;
  };

  const getMatchupData = () => {
    if (!statistics) return [];

    const decks = Object.entries(statistics.matchup_statistics);
    return decks.map(([deckId, deck]) => {
      const rowData: Record<string, string | MatchupStats | null> = {
        key: deckId,
        deck_name: deck.deck_name,
      };

      // 为每个卡组添加对战数据
      decks.forEach(([opponentId]) => {
        rowData[opponentId] = deck.matchups[opponentId] || null;
      });

      return rowData;
    });
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
    </div>
  );
};

export default DeckMatchups;
