import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Modal, Select, Space, Form, InputNumber, Button, message, Tooltip, Row, Col } from 'antd';
import type { TableProps } from 'antd';
import api from '../config/api';
import { API_ENDPOINTS } from '../config/api';
import { QuestionCircleOutlined } from '@ant-design/icons';
// import { useLocation } from 'react-router-dom';

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
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [decksResponse, environmentsResponse, priorDataResponse] = await Promise.all([
          api.get(API_ENDPOINTS.DECKS),
          api.get(API_ENDPOINTS.ENVIRONMENTS),
          api.get<DeckMatchupPriorResponse>(API_ENDPOINTS.PRIOR_KNOWLEDGE)
        ]);

        setDecks(decksResponse.data);
        setEnvironments(environmentsResponse.data);
        setPriors(priorDataResponse.data.matchup_priors);
        setHasPermission(true);
        setIsInitialized(true);
        
        // 设置默认选择最后一个环境
        if (environmentsResponse.data.length > 0) {
          const lastEnvironment = environmentsResponse.data[environmentsResponse.data.length - 1];
          setSelectedEnvironment(lastEnvironment.id);
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }
        message.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isInitialized]);

  // 获取卡组数据
  const fetchDecks = async () => {
    if (!hasPermission) {
      console.log('PriorKnowledgeTable - 用户没有权限，跳过获取卡组数据', {
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('PriorKnowledgeTable - 开始获取卡组数据', {
      selectedEnvironment,
      timestamp: new Date().toISOString()
    });
    try {
      const params = selectedEnvironment ? { environment_id: selectedEnvironment } : {};
      const response = await api.get(API_ENDPOINTS.DECKS, { params });
      console.log('PriorKnowledgeTable - 获取卡组数据成功', {
        count: response.data.length,
        timestamp: new Date().toISOString()
      });
      setDecks(response.data);
    } catch (error: any) {
      console.error('PriorKnowledgeTable - 获取卡组数据失败:', {
        error,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });

      if (error.response?.status === 401) {
        console.log('PriorKnowledgeTable - 获取卡组数据遇到401错误，重定向到登录页', {
          timestamp: new Date().toISOString()
        });
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      message.error('获取卡组数据失败');
    }
  };

  useEffect(() => {
    if (selectedEnvironment && hasPermission && !loading) {
      fetchDecks();
    }
  }, [selectedEnvironment, hasPermission, loading]);

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
        width: window.innerWidth < 768 ? 40 : 60,
        render: (deck: Deck) => (
          <div style={{ 
            fontSize: window.innerWidth < 768 ? '12px' : '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {deck.name}
          </div>
        ),
        ellipsis: true,
      },
      ...decks.map(deck => ({
        title: deck.name,
        dataIndex: deck.id,
        key: deck.id,
        width: window.innerWidth < 768 ? 100 : 120,
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
                  padding: '4px 0',
                  fontSize: window.innerWidth < 768 ? '12px' : '14px'
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
                padding: '4px 0',
                fontSize: window.innerWidth < 768 ? '12px' : '14px'
              }}
              onClick={() => handleCellClick(value)}
            >
              <div>{winRate}%</div>
              <div style={{ fontSize: window.innerWidth < 768 ? '10px' : '12px', color: '#999' }}>
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
      
      // 重新加载先验数据
      const priorDataResponse = await api.get<DeckMatchupPriorResponse>(API_ENDPOINTS.PRIOR_KNOWLEDGE);
      setPriors(priorDataResponse.data.matchup_priors);
      
      // 重新加载卡组数据
      await fetchDecks();
    } catch (error) {
      console.error('保存先验数据失败:', error);
      message.error('保存先验数据失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 添加窗口大小变化监听
  useEffect(() => {
    const handleResize = () => {
      // 强制重新渲染表格
      setDecks([...decks]);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [decks]);

  return (
    <Card bodyStyle={{ padding: '12px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={24} md={12} lg={12}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>梯度表-先验数据</Title>
              <Tooltip title="为了使得梯度表中，对于少样本对局的胜率估计更准确，增设本页面。请填入大家认为的各个对局的优劣情况。若是十分确定本对局的优劣情况，总局数填10或以上。否则填10。修改前请咨询881小团体意见。谢谢配合。">
                <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
              </Tooltip>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择环境"
              value={selectedEnvironment}
              onChange={setSelectedEnvironment}
              options={environments.map(env => ({
                label: env.name,
                value: env.id
              }))}
            />
          </Col>
        </Row>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table
            columns={getColumns()}
            dataSource={getTableData()}
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={false}
            size="small"
          />
        </div>
      </Space>

      <Modal
        title={selectedMatchup ? `${selectedMatchup.deckA.name} vs ${selectedMatchup.deckB.name}` : ''}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: '500px' }}
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
            label="总对局数"
            name="prior_matches"
            rules={[{ required: true, message: '请输入总对局数' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            label={`${selectedMatchup?.deckA.name}胜利局数`}
            name="prior_wins"
            rules={[
              { required: true, message: '请输入胜利局数' },
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