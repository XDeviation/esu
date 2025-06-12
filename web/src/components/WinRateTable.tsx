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
  InputNumber,
  Tooltip,
} from "antd";
import api from "../config/api";
import { useLocation } from "react-router-dom";
import { MatchType } from "../types";
import type { ColumnsType } from "antd/es/table";
import "./WinRateTable.css";

const { Title } = Typography;

interface Environment {
  id: number;
  name: string;
}

interface Deck {
  id: number;
  name: string;
  environment_id: number;
}

interface WinRateCalculation {
  deck_id: number;
  average_win_rate: number;
  weighted_win_rate: number;
  environment_offset: number;
}

interface WinRateCalculationResponse {
  calculations: Record<number, WinRateCalculation>;
  sensitivity: number;
}

const WinRateTable: React.FC = () => {
  const [calculations, setCalculations] = useState<
    Record<number, WinRateCalculation>
  >({});
  const [decks, setDecks] = useState<Record<number, Deck>>({});
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<
    number | undefined
  >();
  const [selectedMatchType, setSelectedMatchType] = useState<string>("");
  const [sensitivity, setSensitivity] = useState<number>(30.0);
  const [priorWeight, setPriorWeight] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const location = useLocation();

  // 检查用户权限
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(user.role === 'admin' || user.role === 'moderator');
  }, []);

  const fetchEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
      if (response.data.length > 0) {
        const latestEnv = response.data[response.data.length - 1];
        setSelectedEnvironment(latestEnv.id);
      }
    } catch (error) {
      console.error("Error fetching environments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMatchTypes = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch (error) {
      console.error("Error fetching match types:", error);
    }
  };

  const fetchDecks = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.DECKS);
      const decksMap = response.data.reduce(
        (acc: Record<number, Deck>, deck: Deck) => {
          acc[deck.id] = deck;
          return acc;
        },
        {} as Record<number, Deck>
      );
      setDecks(decksMap);
    } catch (error) {
      console.error("Error fetching decks:", error);
    }
  };

  const fetchWinRates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("sensitivity", sensitivity.toString());
      params.append("prior_weight", priorWeight.toString());
      if (selectedMatchType) {
        params.append("match_type_id", selectedMatchType);
      }
      if (selectedEnvironment) {
        params.append("environment_id", selectedEnvironment.toString());
      }
      const response = await api.get<WinRateCalculationResponse>(
        `${API_ENDPOINTS.WIN_RATES}/calculate?${params.toString()}`
      );
      setCalculations(response.data.calculations);
    } catch (error) {
      console.error("Error fetching win rates:", error);
      message.error("获取胜率数据失败");
    } finally {
      setLoading(false);
    }
  }, [sensitivity, priorWeight, selectedMatchType, selectedEnvironment]);

  useEffect(() => {
    if (location.pathname === "/win-rate-table") {
      fetchEnvironments();
      fetchDecks();
      fetchMatchTypes();
    }
  }, [location.pathname, fetchEnvironments]);

  useEffect(() => {
    fetchWinRates();
  }, [sensitivity, priorWeight, selectedMatchType, selectedEnvironment, fetchWinRates]);

  interface TableRecord {
    deck_id: number;
    average_win_rate: number;
    weighted_win_rate: number;
  }

  const columns: ColumnsType<TableRecord> = [
    {
      title: "卡组ID",
      dataIndex: "deck_id",
      key: "deck_id",
      width: 100,
      responsive: ["xs"],
    },
    {
      title: "卡组名称",
      dataIndex: "deck_name",
      key: "deck_name",
      width: 200,
      render: (_: string, record: TableRecord) =>
        decks[record.deck_id]?.name || "未知卡组",
    },
    {
      title: "平均胜率",
      dataIndex: "average_win_rate",
      key: "average_win_rate",
      width: 120,
      sorter: (a: TableRecord, b: TableRecord) =>
        a.average_win_rate - b.average_win_rate,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
    {
      title: "加权胜率",
      dataIndex: "weighted_win_rate",
      key: "weighted_win_rate",
      width: 120,
      sorter: (a: TableRecord, b: TableRecord) =>
        a.weighted_win_rate - b.weighted_win_rate,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
  ];

  const dataSource = Object.entries(calculations)
    .filter(([deckId]) => {
      const deck = decks[Number(deckId)];
      return (
        !selectedEnvironment || deck?.environment_id === selectedEnvironment
      );
    })
    .map(([deckId, calc]) => ({
      key: deckId,
      deck_id: Number(deckId),
      average_win_rate: calc.average_win_rate,
      weighted_win_rate: calc.weighted_win_rate,
    }))
    .sort((a, b) => b.weighted_win_rate - a.weighted_win_rate);

  const handleEvolutionPhaseChange = (value: string) => {
    switch (value) {
      case "early":
        setSensitivity(20.0);
        break;
      case "mid":
        setSensitivity(40.0);
        break;
      default:
        setSensitivity(20.0);
    }
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <Row gutter={[16, 16]} justify="center">
          <Col xs={24} sm={24} md={24} lg={24}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Row justify="center">
                <Title level={2} style={{ margin: 0 }}>
                  梯度表
                </Title>
              </Row>
              <Row gutter={[16, 16]} justify="center">
                <Col xs={24} sm={12} md={8}>
                  <Select
                    className="select-container"
                    placeholder="选择环境"
                    allowClear
                    value={selectedEnvironment}
                    onChange={(value) => setSelectedEnvironment(value)}
                  >
                    {environments.map((env) => (
                      <Select.Option key={env.id} value={env.id}>
                        {env.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    className="select-container"
                    placeholder="环境演化进度"
                    defaultValue="early"
                    onChange={handleEvolutionPhaseChange}
                  >
                    <Select.Option value="early">娱乐</Select.Option>
                    <Select.Option value="mid">竞技</Select.Option>
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    className="select-container"
                    placeholder="选择比赛类型"
                    allowClear
                    value={selectedMatchType}
                    onChange={(value) => setSelectedMatchType(value)}
                  >
                    <Select.Option value="">全部</Select.Option>
                    {matchTypes.map((mt) => (
                      <Select.Option key={mt.id} value={mt.id.toString()}>
                        {mt.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                {isAdmin && (
                  <Col xs={24} sm={12} md={8}>
                    <Tooltip title="先验数据权重系数（0.1-10.0）">
                      <InputNumber
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={priorWeight}
                        onChange={(value) => setPriorWeight(value || 1)}
                        addonBefore="先验权重"
                      />
                    </Tooltip>
                  </Col>
                )}
              </Row>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            dataSource={dataSource}
            columns={columns}
            pagination={{
              responsive: true,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: "max-content" }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default WinRateTable;
