import React, { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../config/api";
import {
  message,
  Select,
  Card,
  Table,
  Typography,
  Spin,
  Statistic,
  Row,
  Col,
  Space,
} from "antd";
import api from "../config/api";
import { useLocation } from "react-router-dom";

const { Title } = Typography;

interface Environment {
  id: number;
  name: string;
}

interface DeckStatistics {
  deck_id: string;
  deck_name: string;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface EnvironmentStatistics {
  environment_id: string;
  environment_name: string;
  deck_statistics: DeckStatistics[];
}

const Statistics: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [statistics, setStatistics] = useState<EnvironmentStatistics | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
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
    if (location.pathname === "/statistics") {
      fetchEnvironments();
    }
  }, [location.pathname, fetchEnvironments]);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!selectedEnvironment) return;

      setLoading(true);
      try {
        const response = await api.get(
          `${API_ENDPOINTS.ENVIRONMENTS}${selectedEnvironment}/statistics`
        );
        setStatistics(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedEnvironment]);

  const columns = [
    {
      title: "卡组名称",
      dataIndex: "deck_name",
      key: "deck_name",
      width: 200,
    },
    {
      title: "总场次",
      dataIndex: "total_matches",
      key: "total_matches",
      width: 100,
      sorter: (a: DeckStatistics, b: DeckStatistics) =>
        a.total_matches - b.total_matches,
    },
    {
      title: "胜场",
      dataIndex: "wins",
      key: "wins",
      width: 100,
      sorter: (a: DeckStatistics, b: DeckStatistics) => a.wins - b.wins,
    },
    {
      title: "负场",
      dataIndex: "losses",
      key: "losses",
      width: 100,
      sorter: (a: DeckStatistics, b: DeckStatistics) => a.losses - b.losses,
    },
    {
      title: "胜率",
      dataIndex: "win_rate",
      key: "win_rate",
      width: 100,
      sorter: (a: DeckStatistics, b: DeckStatistics) => a.win_rate - b.win_rate,
      render: (winRate: number) => `${winRate}%`,
    },
  ];

  const getTotalStats = () => {
    if (!statistics) return { total: 0, wins: 0, losses: 0, winRate: 0 };

    const totals = statistics.deck_statistics.reduce(
      (acc, curr) => ({
        total: acc.total + curr.total_matches,
        wins: acc.wins + curr.wins,
        losses: acc.losses + curr.losses,
      }),
      { total: 0, wins: 0, losses: 0 }
    );

    const winRate = totals.total > 0 ? (totals.wins / totals.total) * 100 : 0;

    return {
      ...totals,
      winRate: Number(winRate.toFixed(2)),
    };
  };

  const totalStats = getTotalStats();

  return (
    <div className="p-6">
      <Card className="mb-6">
        <Row justify="center">
          <Col>
            <Space size="large" align="center">
              <Title level={2} style={{ margin: 0 }}>
                战绩统计
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
              {statistics && (
                <Statistic
                  title="总场次"
                  value={totalStats.total}
                  valueStyle={{ fontSize: "20px" }}
                />
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {statistics && (
            <Table
              dataSource={statistics.deck_statistics}
              columns={columns}
              rowKey="deck_id"
              pagination={false}
              scroll={{ x: "max-content" }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Statistics;
