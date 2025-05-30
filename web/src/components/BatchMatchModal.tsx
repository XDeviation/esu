import React from 'react';
import { Modal, Form, Row, Col, Select, Button, Card, Radio, Checkbox, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Environment, Deck, MatchType, BatchMatch } from '../types';

interface BatchMatchModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    environment_id: number;
    match_type_id: number;
    first_deck_id: number;
    second_deck_id: number;
    matches: BatchMatch[];
    ignore_first_player: boolean;
  }) => void;
  environments: Environment[];
  decks: Deck[];
  matchTypes: MatchType[];
  initialValues?: {
    first_deck_id?: number;
    second_deck_id?: number;
    environment_id?: number;
    match_type_id?: number;
    ignore_first_player?: boolean;
  };
}

const BatchMatchModal: React.FC<BatchMatchModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  environments,
  decks,
  matchTypes,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [selectedEnvironment, setSelectedEnvironment] = React.useState<number | undefined>();

  // 当visible或initialValues变化时，更新表单值
  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          matches: [
            {
              first_player: "first",
              win: "first",
            },
          ],
        });
        setSelectedEnvironment(initialValues.environment_id);
      }
    }
  }, [visible, initialValues, form]);

  // 获取当前环境下的卡组
  const getFilteredDecks = () => {
    if (!selectedEnvironment) return decks;
    return decks.filter(deck => deck.environment_id === selectedEnvironment);
  };

  const handleEnvironmentChange = (value: number) => {
    setSelectedEnvironment(value);
    // 清除已选择的卡组
    form.setFieldsValue({
      first_deck_id: undefined,
      second_deck_id: undefined
    });
  };

  const handleAddBatchMatch = () => {
    const matches = form.getFieldValue("matches") || [];
    form.setFieldsValue({
      matches: [...matches, { first_player: "first", win: "first" }],
    });
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue();
    const filteredDecks = getFilteredDecks();
    
    // 验证卡组是否属于当前环境
    const firstDeck = filteredDecks.find(d => d.id === values.first_deck_id);
    const secondDeck = filteredDecks.find(d => d.id === values.second_deck_id);
    
    if (!firstDeck || !secondDeck) {
      message.error('请选择当前环境下的卡组');
      return;
    }

    if (values.ignore_first_player) {
      values.matches = values.matches.map((match: BatchMatch) => ({
        ...match,
        first_player: "0"
      }));
    }
    onSubmit(values);
  };

  return (
    <Modal
      title="添加战绩"
      open={visible}
      onOk={() => form.submit()}
      onCancel={() => {
        form.resetFields();
        setSelectedEnvironment(undefined);
        onCancel();
      }}
      destroyOnClose
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="environment_id"
              label="环境"
              rules={[{ required: true, message: "请选择环境" }]}
            >
              <Select onChange={handleEnvironmentChange}>
                {environments.map((env) => (
                  <Select.Option key={env.id} value={env.id}>
                    {env.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="match_type_id"
              label="比赛类型"
              rules={[{ required: true, message: "请选择比赛类型" }]}
            >
              <Select>
                {matchTypes.map((type) => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="first_deck_id"
              label="卡组1"
              rules={[{ required: true, message: "请选择卡组1" }]}
            >
              <Select>
                {getFilteredDecks().map((deck) => (
                  <Select.Option key={deck.id} value={deck.id}>
                    {deck.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="second_deck_id"
              label="卡组2"
              rules={[{ required: true, message: "请选择卡组2" }]}
            >
              <Select>
                {getFilteredDecks().map((deck) => (
                  <Select.Option key={deck.id} value={deck.id}>
                    {deck.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="ignore_first_player" valuePropName="checked">
          <Checkbox>
            忽略先后手
          </Checkbox>
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span>对战记录</span>
            <Button
              type="dashed"
              onClick={handleAddBatchMatch}
              icon={<PlusOutlined />}
            >
              添加对战
            </Button>
          </div>
          <Form.List name="matches">
            {(fields, { remove }) => (
              <Form.Item
                noStyle
                dependencies={['ignore_first_player']}
              >
                {() => (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {fields.map((field, index) => {
                      const firstDeckId = form.getFieldValue("first_deck_id");
                      const secondDeckId = form.getFieldValue("second_deck_id");
                      const firstDeck = decks.find((d) => d.id === firstDeckId);
                      const secondDeck = decks.find((d) => d.id === secondDeckId);
                      const firstDeckName = firstDeck
                        ? firstDeck.name
                        : "卡组1";
                      const secondDeckName = secondDeck
                        ? secondDeck.name
                        : "卡组2";
                      const ignoreFirstPlayer = form.getFieldValue("ignore_first_player");

                      return (
                        <Card
                          key={`match-${field.key}`}
                          title={`对战 ${index + 1}`}
                          extra={
                            fields.length > 1 && (
                              <Button
                                type="link"
                                danger
                                onClick={() => remove(field.name)}
                              >
                                删除
                              </Button>
                            )
                          }
                        >
                          <Row gutter={16} align="middle">
                            {!ignoreFirstPlayer && (
                              <>
                                <Col span={6}>
                                  <div
                                    style={{
                                      textAlign: "center",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    先手
                                  </div>
                                </Col>
                                <Col span={6}>
                                  <Form.Item
                                    key={`first-${field.key}`}
                                    name={[field.name, "first_player"]}
                                    noStyle
                                  >
                                    <Radio.Group>
                                      <Radio value="first" style={{ whiteSpace: 'nowrap' }}>{firstDeckName}</Radio>
                                      <Radio value="second" style={{ whiteSpace: 'nowrap' }}>{secondDeckName}</Radio>
                                    </Radio.Group>
                                  </Form.Item>
                                </Col>
                              </>
                            )}
                            <Col span={ignoreFirstPlayer ? 12 : 6}>
                              <div
                                style={{
                                  textAlign: "center",
                                  fontWeight: "bold",
                                }}
                              >
                                胜利
                              </div>
                            </Col>
                            <Col span={ignoreFirstPlayer ? 12 : 6}>
                              <Form.Item
                                key={`win-${field.key}`}
                                name={[field.name, "win"]}
                                noStyle
                              >
                                <Radio.Group>
                                  <Radio value="first" style={{ whiteSpace: 'nowrap' }}>{firstDeckName}</Radio>
                                  <Radio value="second" style={{ whiteSpace: 'nowrap' }}>{secondDeckName}</Radio>
                                </Radio.Group>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Form.Item>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
};

export default BatchMatchModal; 