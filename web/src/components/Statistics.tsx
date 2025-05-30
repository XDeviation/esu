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
import "./Statistics.css";

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

interface MatchType {
  id: number;
  name: string;
}

type SortType = "total_matches_desc" | "win_rate_desc";

const Statistics: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedMatchType, setSelectedMatchType] = useState<string>("");
  const [statistics, setStatistics] = useState<EnvironmentStatistics | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [sortType, setSortType] = useState<SortType>("total_matches_desc");
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

  const fetchMatchTypes = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch (error) {
      console.error("获取比赛类型列表失败", error);
    }
  };

  useEffect(() => {
    if (location.pathname === "/statistics") {
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
          `${API_ENDPOINTS.STATISTICS}?${params.toString()}`
        );
        setStatistics(response.data);
      } catch (err) {
        console.error("获取统计数据失败", err);
        message.error("获取统计数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedEnvironment, selectedMatchType, sortType]);

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

    // 总场数除以2，因为每场对战都统计了两次
    const totalMatches = totals.total / 2;
    const winRate = totalMatches > 0 ? (totals.wins / totalMatches) * 100 : 0;

    return {
      total: Math.round(totalMatches),
      wins: totals.wins,
      losses: totals.losses,
      winRate: Number(winRate.toFixed(2)),
    };
  };

  const totalStats = getTotalStats();

  const getSortedStatistics = () => {
    if (!statistics) return [];

    const sortedStats = [...statistics.deck_statistics];
    switch (sortType) {
      case "total_matches_desc":
        return sortedStats.sort((a, b) => b.total_matches - a.total_matches);
      case "win_rate_desc":
        return sortedStats.sort((a, b) => b.win_rate - a.win_rate);
      default:
        return sortedStats;
    }
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <Row gutter={[16, 16]} justify="center">
          <Col xs={24} sm={24} md={24} lg={24}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row justify="center">
                <Title level={2} style={{ margin: 0 }}>
                  战绩统计
                </Title>
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
                    value={sortType}
                    onChange={(value) => setSortType(value)}
                    className="select-container"
                    placeholder="排序方式"
                  >
                    <Select.Option value="total_matches_desc">
                      总场数降序
                    </Select.Option>
                    <Select.Option value="win_rate_desc">胜率降序</Select.Option>
                  </Select>
                </Col>
              </Row>
              <Row justify="center">
                <Col>
                  <Statistic
                    title="总场次"
                    value={totalStats.total}
                    valueStyle={{ fontSize: "20px" }}
                  />
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
              dataSource={getSortedStatistics()}
              columns={columns}
              rowKey="deck_id"
              pagination={{
                responsive: true,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ x: 'max-content' }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Statistics;
