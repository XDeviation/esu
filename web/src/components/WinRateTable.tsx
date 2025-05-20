import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE_URL } from '../config/api';
import { Card, Table, Typography, Spin, Input, Button, Row, Col, Space } from 'antd';

const { Title } = Typography;

interface Deck {
  id: number;
  name: string;
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
  const [sensitivity, setSensitivity] = useState<number>(30.0);
  const [loading, setLoading] = useState<boolean>(false);

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
    fetchDecks();
    fetchWinRates();
  }, [sensitivity, fetchWinRates]);

  interface TableRecord {
    deck_id: number;
    average_win_rate: number;
    weighted_win_rate: number;
  }

  const columns = [
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
      render: (text: string, record: TableRecord) => decks[record.deck_id]?.name || '未知卡组',
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
  ];

  const dataSource = Object.entries(calculations).map(([deckId, calc]) => ({
    key: deckId,
    deck_id: Number(deckId),
    average_win_rate: calc.average_win_rate,
    weighted_win_rate: calc.weighted_win_rate,
  }));

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
                <Input
                  type="number"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  min={1}
                  max={100}
                  step={1}
                  addonBefore="环境功利指数"
                  style={{ width: 200 }}
                />
                <Button type="primary" onClick={fetchWinRates} loading={loading}>
                  {loading ? '加载中...' : '刷新'}
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default WinRateTable; 