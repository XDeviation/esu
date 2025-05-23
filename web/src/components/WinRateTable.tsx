import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api, { API_BASE_URL } from '../config/api';
import { Card, Table, Typography, Spin, Button, Row, Col, Space, Select } from 'antd';
import debounce from 'lodash/debounce';

const { Title, Text } = Typography;

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
  const [calculations, setCalculations] = useState<Record<number, WinRateCalculation>>({});
  const [decks, setDecks] = useState<Record<number, Deck>>({});
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<number | undefined>();
  const [sensitivity, setSensitivity] = useState<number>(30.0);
  const [loading, setLoading] = useState<boolean>(false);

  // 使用 Map 优化查找操作
  const decksMap = useMemo(() => {
    return new Map(Object.entries(decks).map(([id, deck]) => [Number(id), deck]));
  }, [decks]);

  // 防抖处理环境选择
  const debouncedSetSelectedEnvironment = useCallback(
    debounce((value: number | undefined) => {
      setSelectedEnvironment(value);
    }, 300),
    []
  );

  const fetchEnvironments = async () => {
    try {
      const response = await api.get<Environment[]>(`${API_BASE_URL}/api/v1/environments`);
      setEnvironments(response.data);
      // 默认选择最新的环境
      if (response.data.length > 0) {
        const latestEnv = response.data[response.data.length - 1];
        setSelectedEnvironment(latestEnv.id);
      }
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  };

  const fetchDecks = async () => {
    try {
      const response = await api.get<Deck[]>(`${API_BASE_URL}/api/v1/decks`);
      const decksMap = response.data.reduce((acc, deck) => {
        acc[deck.id] = deck;
        return acc;
      }, {} as Record<number, Deck>);
      setDecks(decksMap);
    } catch (error) {
      console.error('Error fetching decks:', error);
    }
  };

  const fetchWinRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post<WinRateCalculationResponse>(`${API_BASE_URL}/api/v1/win-rates/calculate`, {
        sensitivity,
        environment_offsets: null
      });
      setCalculations(response.data.calculations);
    } catch (error) {
      console.error('Error fetching win rates:', error);
    } finally {
      setLoading(false);
    }
  }, [sensitivity]);

  useEffect(() => {
    fetchEnvironments();
    fetchDecks();
    fetchWinRates();
  }, [sensitivity, fetchWinRates]);

  interface TableRecord {
    deck_id: number;
    average_win_rate: number;
    weighted_win_rate: number;
  }

  const columns = useMemo(() => [
    {
      title: "卡组ID",
      dataIndex: "deck_id",
      key: "deck_id",
      width: 100,
    },
    {
      title: "卡组名称",
      dataIndex: "deck_name",
      key: "deck_name",
      width: 200,
      render: (_: string, record: TableRecord) => decksMap.get(record.deck_id)?.name || '未知卡组',
    },
    {
      title: "平均胜率",
      dataIndex: "average_win_rate",
      key: "average_win_rate",
      width: 120,
      sorter: (a: TableRecord, b: TableRecord) => a.average_win_rate - b.average_win_rate,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
    {
      title: "加权胜率",
      dataIndex: "weighted_win_rate",
      key: "weighted_win_rate",
      width: 120,
      sorter: (a: TableRecord, b: TableRecord) => a.weighted_win_rate - b.weighted_win_rate,
      render: (value: number) => `${(value * 100).toFixed(2)}%`,
    },
  ], [decksMap]);

  const dataSource = useMemo(() => {
    return Object.entries(calculations)
      .filter(([deckId]) => {
        const deck = decksMap.get(Number(deckId));
        return !selectedEnvironment || deck?.environment_id === selectedEnvironment;
      })
      .map(([deckId, calc]) => ({
        key: deckId,
        deck_id: Number(deckId),
        average_win_rate: calc.average_win_rate,
        weighted_win_rate: calc.weighted_win_rate,
      }))
      .sort((a, b) => b.weighted_win_rate - a.weighted_win_rate);
  }, [calculations, decksMap, selectedEnvironment]);

  const handleEvolutionPhaseChange = useCallback((value: string) => {
    switch (value) {
      case 'early':
        setSensitivity(15.0);
        break;
      case 'mid':
        setSensitivity(30.0);
        break;
      case 'late':
        setSensitivity(45.0);
        break;
      default:
        setSensitivity(15.0);
    }
  }, []);

  return (
    <div className="p-6">
      <Card className="mb-6">
        <Row justify="center">
          <Col>
            <Space size="large" align="center">
              <Title level={2} style={{ margin: 0 }}>
                梯度表
              </Title>
              <Space>
                <Select
                  style={{ width: 200 }}
                  placeholder="选择环境"
                  allowClear
                  value={selectedEnvironment}
                  onChange={debouncedSetSelectedEnvironment}
                >
                  {environments.map((env) => (
                    <Select.Option key={env.id} value={env.id}>
                      {env.name}
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  style={{ width: 200 }}
                  placeholder="环境演化进度"
                  defaultValue="early"
                  onChange={handleEvolutionPhaseChange}
                >
                  <Select.Option value="early">前期</Select.Option>
                  <Select.Option value="mid">中期</Select.Option>
                  <Select.Option value="late">末期</Select.Option>
                </Select>
                <Button type="primary" onClick={fetchWinRates} loading={loading}>
                  {loading ? '加载中...' : '刷新'}
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16, backgroundColor: '#fffbe6' }}>
        <Text type="warning">
          提示：梯度表数据仅供参考，实际对局结果可能因玩家水平、卡组构筑等因素而有所不同。
        </Text>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
          rowKey="deck_id"
        />
      </Card>
    </div>
  );
};

export default WinRateTable; 