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
import { UserRole, MatchType } from "../types";

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
  const [userRole, setUserRole] = useState<UserRole>(UserRole.PLAYER);
  const location = useLocation();

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.USERS_ME);
      setUserRole(response.data.role);
    } catch (error) {
      console.error("获取用户信息失败:", error);
    }
  }, []);

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

  const fetchMatchTypes = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
      // 设置默认的对局类型
      if (response.data.length > 0) {
        // 如果是普通玩家，选择第一个不需要权限的比赛类型
        if (userRole === UserRole.PLAYER) {
          const firstAvailableType = response.data.find((type: MatchType) => !type.require_permission);
          if (firstAvailableType) {
            setSelectedMatchType(firstAvailableType.id.toString());
          }
        } else {
          // 对于管理员和版主，选择第一个比赛类型
          setSelectedMatchType(response.data[0].id.toString());
        }
      }
    } catch (error) {
      message.error("获取比赛类型失败");
    }
  }, [userRole]);

  useEffect(() => {
    if (location.pathname === "/statistics") {
      fetchEnvironments();
      fetchUserInfo();
    }
  }, [location.pathname, fetchEnvironments, fetchUserInfo]);

  useEffect(() => {
    fetchMatchTypes();
  }, [fetchMatchTypes]);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!selectedEnvironment) return;

      setLoading(true);
      try {
        const response = await api.get(
          `${API_ENDPOINTS.ENVIRONMENTS}${selectedEnvironment}/statistics${selectedMatchType ? `?match_type_id=${selectedMatchType}` : ''}`
        );
        setStatistics(response.data);
      } catch (err) {
        message.error("获取统计数据失败");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedEnvironment, selectedMatchType]);

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
              <Select
                value={selectedMatchType}
                onChange={(value) => setSelectedMatchType(value)}
                style={{ width: 200 }}
                loading={loading}
                placeholder="请选择比赛类型"
                allowClear={userRole !== UserRole.PLAYER}
              >
                {matchTypes
                  .filter((type: MatchType) => userRole !== UserRole.PLAYER || !type.require_permission)
                  .map((type) => (
                    <Select.Option key={type.id} value={type.id.toString()}>
                      {type.name}
                    </Select.Option>
                  ))}
              </Select>
              <Select
                value={sortType}
                onChange={(value) => setSortType(value)}
                style={{ width: 150 }}
                placeholder="排序方式"
              >
                <Select.Option value="total_matches_desc">总场数降序</Select.Option>
                <Select.Option value="win_rate_desc">胜率降序</Select.Option>
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
              dataSource={getSortedStatistics()}
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
