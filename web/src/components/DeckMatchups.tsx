import React, { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../config/api";
import {
  message,
  Select,
  Card,
  Table,
  Typography,
  Spin,
  Space,
  Row,
  Col,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import api from "../config/api";
import { useLocation } from "react-router-dom";

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
}

interface DeckMatchup {
  deck_name: string;
  matchups: Record<string, MatchupStats>;
}

interface MatchupStatistics {
  environment_id: string;
  environment_name: string;
  matchup_statistics: Record<string, DeckMatchup>;
}

interface TableRowData {
  key: string;
  deck_name: string;
  [key: string]: string | MatchupStats | null;
}

const DeckMatchups: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [statistics, setStatistics] = useState<MatchupStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const location = useLocation();

  const fetchEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
      // 默认选择最新的环境
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

  useEffect(() => {
    if (location.pathname === "/deck-matchups") {
      fetchEnvironments();
    }
  }, [location.pathname, fetchEnvironments]);

  useEffect(() => {
    const fetchMatchups = async () => {
      if (!selectedEnvironment) return;

      setLoading(true);
      setError("");
      try {
        const response = await api.get(
          `${API_ENDPOINTS.ENVIRONMENTS}${selectedEnvironment}/deck-matchups`
        );
        setStatistics(response.data);
      } catch (err) {
        setError("获取对战数据失败");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchups();
  }, [selectedEnvironment]);

  const generateColumns = (): ColumnsType<TableRowData> => {
    if (!statistics) return [];

    const decks = Object.entries(statistics.matchup_statistics);
    const columns: ColumnsType<TableRowData> = [
      {
        title: "卡组",
        dataIndex: "deck_name",
        key: "deck_name",
        fixed: "left",
        width: 150,
      },
    ];

    // 为每个卡组添加一列
    decks.forEach(([deckId, deck]) => {
      columns.push({
        title: deck.deck_name,
        dataIndex: deckId,
        key: deckId,
        width: 100,
        render: (value: MatchupStats | null) => {
          if (!value) return "-";
          return (
            <div style={{ textAlign: "center" }}>
              <div>{value.win_rate}%</div>
              <div style={{ fontSize: "12px", color: "#999" }}>
                {value.wins}/{value.total}
              </div>
            </div>
          );
        },
      });
    });

    return columns;
  };

  const generateTableData = (): TableRowData[] => {
    if (!statistics) return [];

    const decks = Object.entries(statistics.matchup_statistics);
    return decks.map(([deckId, deck]) => {
      const rowData: TableRowData = {
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
            </Space>
          </Col>
        </Row>
      </Card>

      {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

      <Spin spinning={loading}>
        {statistics && (
          <Card>
            <Table
              dataSource={generateTableData()}
              columns={generateColumns()}
              pagination={false}
              scroll={{ x: "max-content" }}
              bordered
            />
          </Card>
        )}
      </Spin>
    </div>
  );
};

export default DeckMatchups;
