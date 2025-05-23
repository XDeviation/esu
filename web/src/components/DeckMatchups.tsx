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
import BatchMatchModal from './BatchMatchModal';
import { handleBatchSubmit as submitBatchMatch } from '../utils/matchResults';
import { MatchType, UserRole } from '../types';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

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

interface MatchupStats {
  opponent_name: string;
  total: number;
  wins: number;
  losses: number;
  win_rate: number;
  first_hand_total?: number;
  first_hand_wins?: number;
  second_hand_total?: number;
  second_hand_wins?: number;
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

interface BatchMatch {
  first_player: "first" | "second";
  win: "first" | "second";
}

const DeckMatchups: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedHand, setSelectedHand] = useState<string>("all");
  const [selectedMatchType, setSelectedMatchType] = useState<string>("");
  const [statistics, setStatistics] = useState<MatchupStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [batchModalVisible, setBatchModalVisible] = useState<boolean>(false);
  const [modalInitialValues, setModalInitialValues] = useState<{
    first_deck_id?: number;
    second_deck_id?: number;
    environment_id?: number;
    match_type_id?: number;
  }>({});
  const [decks, setDecks] = useState<Deck[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
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
      console.error("获取比赛类型列表失败:", error);
      message.error("获取比赛类型列表失败");
    }
  }, [userRole]);

  useEffect(() => {
    if (location.pathname === "/deck-matchups") {
      fetchEnvironments();
      fetchDecks();
      fetchUserInfo();
    }
  }, [location.pathname, fetchEnvironments, fetchDecks, fetchUserInfo]);

  useEffect(() => {
    fetchMatchTypes();
  }, [fetchMatchTypes]);

  useEffect(() => {
    const fetchMatchups = async () => {
      if (!selectedEnvironment) return;

      setLoading(true);
      setError("");
      try {
        const response = await api.get(
          `${API_ENDPOINTS.ENVIRONMENTS}${selectedEnvironment}/deck-matchups${selectedMatchType ? `?match_type_id=${selectedMatchType}` : ''}`
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
  }, [selectedEnvironment, selectedMatchType]);

  const handleCellClick = (deckId: string, opponentId: string) => {
    if (!statistics) return;
    
    const deck = statistics.matchup_statistics[deckId];
    const opponent = statistics.matchup_statistics[opponentId];
    
    if (!deck || !opponent) return;

    // 设置初始值
    setModalInitialValues({
      first_deck_id: parseInt(deckId),  // 将字符串转换为数字
      second_deck_id: parseInt(opponentId),  // 将字符串转换为数字
      environment_id: parseInt(selectedEnvironment),  // 将环境ID转换为数字
      match_type_id: matchTypes.length > 0 ? matchTypes[0].id : undefined,
    });
    
    // 打开模态框
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
      // 刷新对战数据
      const response = await api.get(
        `${API_ENDPOINTS.ENVIRONMENTS}${selectedEnvironment}/deck-matchups${selectedMatchType ? `?match_type_id=${selectedMatchType}` : ''}`
      );
      setStatistics(response.data);
    }
  };

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
        width: 150,
        onCell: (record) => ({
          onClick: () => handleCellClick(record.key, deckId),
          style: { cursor: 'pointer' }
        }),
        render: (value: MatchupStats | null) => {
          if (!value) return "-";
          
          if (selectedHand === "both") {
            const firstHandWinRate = value.first_hand_wins && value.first_hand_total 
              ? (value.first_hand_wins / value.first_hand_total * 100) 
              : 0;
            const secondHandWinRate = value.second_hand_wins && value.second_hand_total 
              ? (value.second_hand_wins / value.second_hand_total * 100) 
              : 0;
            
            const totalWinRate = value.win_rate;
            const backgroundColor = totalWinRate > 50 
              ? 'rgba(82, 196, 26, 0.1)'
              : totalWinRate < 50 
                ? 'rgba(255, 77, 79, 0.1)'
                : 'transparent';

            return (
              <div style={{ 
                textAlign: "center",
                backgroundColor,
                padding: '4px 0'
              }}>
                <div>{totalWinRate.toFixed(1)}%</div>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {value.wins}/{value.total}
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-around',
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#666'
                }}>
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
                win_rate: value.first_hand_wins ? (value.first_hand_wins / value.first_hand_total * 100) : 0
              };
            } else if (selectedHand === "second" && value.second_hand_total) {
              displayStats = {
                ...value,
                total: value.second_hand_total,
                wins: value.second_hand_wins || 0,
                win_rate: value.second_hand_wins ? (value.second_hand_wins / value.second_hand_total * 100) : 0
              };
            }
            
            const backgroundColor = displayStats.win_rate > 50 
              ? 'rgba(82, 196, 26, 0.1)'
              : displayStats.win_rate < 50 
                ? 'rgba(255, 77, 79, 0.1)'
                : 'transparent';

            return (
              <div style={{ 
                textAlign: "center",
                backgroundColor,
                padding: '4px 0'
              }}>
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
      <Card style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}>
        <Typography.Text type="secondary">
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          提示：单击表格快速提交战绩
        </Typography.Text>
      </Card>
      <Card className="mb-6">
        <Row justify="center">
          <Col>
            <Space size="large" align="center">
              <Space>
                <Title level={2} style={{ margin: 0 }}>
                  战绩总表统计
                </Title>
              </Space>
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
                value={selectedHand}
                onChange={(value) => setSelectedHand(value)}
                style={{ width: 120 }}
                placeholder="请选择先后手"
              >
                <Select.Option value="all">默认</Select.Option>
                <Select.Option value="both">显示先后手</Select.Option>
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

      <BatchMatchModal
        visible={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        onSubmit={handleBatchSubmit}
        environments={environments}
        decks={decks}
        matchTypes={matchTypes}
        initialValues={modalInitialValues}
      />
    </div>
  );
};

export default DeckMatchups;
