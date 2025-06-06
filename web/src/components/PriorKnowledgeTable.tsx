import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Modal, Select, Space, Form, InputNumber, Button, message, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import api from '../config/api';
import { API_ENDPOINTS } from '../config/api';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface Deck {
  id: number;
  name: string;
  environment_id: number;
}

interface Environment {
  id: number;
  name: string;
}

interface DeckMatchupPrior {
  deck_a_id: number;
  deck_b_id: number;
  prior_matches: number;
  prior_wins: number;
}

interface DeckMatchupPriorResponse {
  matchup_priors: { [key: string]: DeckMatchupPrior };
}

const PriorKnowledgeTable: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatchup, setSelectedMatchup] = useState<{
    deckA: Deck;
    deckB: Deck;
    prior?: DeckMatchupPrior;
  } | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [priors, setPriors] = useState<{ [key: string]: DeckMatchupPrior }>({});

  // 获取卡组数据
  const fetchDecks = async () => {
    try {
      const params = selectedEnvironment ? { environment_id: selectedEnvironment } : {};
      const response = await api.get(API_ENDPOINTS.DECKS, { params });
      setDecks(response.data);
    } catch (error) {
      console.error('获取卡组数据失败:', error);
    }
  };

  // 获取环境数据
  const fetchEnvironments = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
    } catch (error) {
      console.error('获取环境数据失败:', error);
    }
  };

  // 获取先验数据
  const fetchPriorData = async () => {
    try {
      const response = await api.get<DeckMatchupPriorResponse>(API_ENDPOINTS.PRIOR_KNOWLEDGE);
      setPriors(response.data.matchup_priors);
    } catch (error) {
      console.error('获取先验数据失败:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDecks(), fetchEnvironments(), fetchPriorData()]);
      setLoading(false);
    };
    loadData();
  }, [selectedEnvironment]);

  // 生成表格数据
  const getTableData = () => {
    if (!decks.length) return [];
    
    return decks.map(deckA => {
      const row: any = {
        key: deckA.id,
        deck: deckA,
      };
      
      decks.forEach(deckB => {
        if (deckA.id === deckB.id) {
          row[deckB.id] = {
            deckA,
            deckB,
            prior: null
          };
        } else {
          // 尝试获取正向的先验数据
          const forwardKey = `${deckA.id}_${deckB.id}`;
          const forwardPrior = priors[forwardKey];
          
          // 尝试获取反向的先验数据
          const reverseKey = `${deckB.id}_${deckA.id}`;
          const reversePrior = priors[reverseKey];
          
          // 如果存在正向数据，使用正向数据
          // 如果存在反向数据，计算互补数据
          // 如果都不存在，返回null
          if (forwardPrior) {
            row[deckB.id] = {
              deckA,
              deckB,
              prior: forwardPrior
            };
          } else if (reversePrior) {
            row[deckB.id] = {
              deckA,
              deckB,
              prior: {
                deck_a_id: deckA.id,
                deck_b_id: deckB.id,
                prior_matches: reversePrior.prior_matches,
                prior_wins: reversePrior.prior_matches - reversePrior.prior_wins
              }
            };
          } else {
            row[deckB.id] = {
              deckA,
              deckB,
              prior: null
            };
          }
        }
      });
      
      return row;
    });
  };

  // 获取列定义
  const getColumns = () => {
    const columns: TableProps<any>['columns'] = [
      {
        title: '卡组',
        dataIndex: 'deck',
        key: 'deck',
        fixed: 'left',
        width: 200,
        render: (deck: Deck) => deck.name,
        ellipsis: true,
      },
      ...decks.map(deck => ({
        title: deck.name,
        dataIndex: deck.id,
        key: deck.id,
        width: 150,
        render: (value: any) => {
          if (!value) return null;
          const { prior } = value;
          
          // 如果是同一个卡组，显示"-"
          if (value.deckA.id === value.deckB.id) {
            return <div style={{ color: '#999' }}>-</div>;
          }
          
          // 如果没有先验数据，显示可点击的占位符
          if (!prior || prior.prior_matches === 0) {
            return (
              <div 
                style={{ 
                  cursor: 'pointer',
                  color: '#999',
                  textAlign: 'center',
                  padding: '4px 0'
                }}
                onClick={() => handleCellClick(value)}
              >
                点击设置
              </div>
            );
          }
          
          const winRate = (prior.prior_wins / prior.prior_matches * 100).toFixed(1);
          const winRateValue = prior.prior_wins / prior.prior_matches;
          
          return (
            <div 
              style={{ 
                cursor: 'pointer',
                backgroundColor: winRateValue >= 0.5
                  ? `rgba(0, 255, 0, ${winRateValue * 0.2})`
                  : `rgba(255, 0, 0, ${(1 - winRateValue) * 0.2})`,
                textAlign: 'center',
                padding: '4px 0'
              }}
              onClick={() => handleCellClick(value)}
            >
              <div>{winRate}%</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {prior.prior_wins}/{prior.prior_matches}
              </div>
            </div>
          );
        }
      }))
    ];
    return columns;
  };

  // 处理单元格点击
  const handleCellClick = (value: any) => {
    setSelectedMatchup({
      deckA: value.deckA,
      deckB: value.deckB,
      prior: value.prior
    });
    // 设置表单初始值
    form.setFieldsValue({
      prior_matches: value.prior?.prior_matches || 0,
      prior_wins: value.prior?.prior_wins || 0
    });
    setModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    if (!selectedMatchup) return;
    
    setSubmitting(true);
    try {
      const data = {
        deck_a_id: selectedMatchup.deckA.id,
        deck_b_id: selectedMatchup.deckB.id,
        prior_matches: values.prior_matches,
        prior_wins: values.prior_wins
      };

      await api.post(API_ENDPOINTS.PRIOR_KNOWLEDGE, data);
      message.success('先验数据保存成功');
      setModalVisible(false);
      // 重新加载数据
      await fetchPriorData();
    } catch (error) {
      console.error('保存先验数据失败:', error);
      message.error('保存先验数据失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Title level={4}>梯度表-先验数据</Title>
          <Tooltip title="为了使得梯度表中，对于少样本对局的胜率估计更准确，增设本页面。请填入大家认为的各个对局的优劣情况。若是十分确定本对局的优劣情况，总局数填20。否则填10。修改前请咨询881小团体意见。谢谢配合。">
            <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
          </Tooltip>
          <Select
            style={{ width: 200 }}
            placeholder="选择环境"
            allowClear
            value={selectedEnvironment}
            onChange={setSelectedEnvironment}
            options={environments.map(env => ({
              label: env.name,
              value: env.id
            }))}
          />
        </Space>
        <Table
          columns={getColumns()}
          dataSource={getTableData()}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
        />
      </Space>

      <Modal
        title={selectedMatchup ? `${selectedMatchup.deckA.name} vs ${selectedMatchup.deckB.name}` : ''}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            prior_matches: 0,
            prior_wins: 0
          }}
        >
          <Form.Item
            label="先验总对局数"
            name="prior_matches"
            rules={[{ required: true, message: '请输入先验总对局数' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            label="先验胜利局数"
            name="prior_wins"
            rules={[
              { required: true, message: '请输入先验胜利局数' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value <= getFieldValue('prior_matches')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('胜利局数不能大于总对局数'));
                },
              }),
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default PriorKnowledgeTable; 