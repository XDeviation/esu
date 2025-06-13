import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  Select,
  Row,
  Col,
  Typography,
  Descriptions,
  App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CopyOutlined } from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import type { TableProps } from 'antd';
import { AxiosError } from "axios";

const { TextArea } = Input;
const { Text } = Typography;

interface Card {
  name: string;
  count: number;
}

interface Deck {
  id: number;
  name: string;
  environment_id: number;
  author_id: string;
  description?: string;
  composition?: Card[];
  deck_code?: string;
}

interface Environment {
  id: number;
  name: string;
}

const Decks: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [viewingDeck, setViewingDeck] = useState<Deck | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.DECKS);
      setDecks(response.data);
    } catch (error) {
      message.error("获取卡组列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
    } catch (error) {
      message.error("获取环境列表失败");
    }
  }, [message]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      setIsAdmin(response.data.is_admin);
      setIsModerator(response.data.is_moderator);
    } catch {
      setIsAdmin(false);
      setIsModerator(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
    fetchEnvironments();
    checkAdminStatus();
  }, [fetchDecks, fetchEnvironments, checkAdminStatus]);

  const handleCreate = () => {
    if (!isModerator) {
      message.warning("只有版主及以上权限能够创建卡组。如有需要请联系版主或管理员");
      return;
    }
    setEditingDeck(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Deck) => {
    if (!isModerator) {
      message.warning("只有版主及以上权限能够编辑卡组。如有需要请联系版主或管理员");
      return;
    }
    setEditingDeck(record);
    form.setFieldsValue({
      ...record,
      composition: record.composition
        ? JSON.stringify(record.composition, null, 2)
        : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      message.warning("只有管理员能够删除卡组。如有需要请联系管理员");
      return;
    }
    try {
      await api.delete(`${API_ENDPOINTS.DECKS}${id}`);
      message.success("删除成功");
      fetchDecks();
    } catch (error) {
      message.error("删除失败");
    }
  };

  // 修改验证函数
  const validateComposition = (composition: any): boolean => {
    if (!composition) {
      return true; // 允许为空
    }

    try {
      const parsed = JSON.parse(composition);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        message.error("卡组构成必须为正确的json格式");
        return false;
      }
      return true;
    } catch (error) {
      message.error("卡组构成格式错误，请检查 JSON 格式");
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 处理卡组构成
      if (values.composition && values.composition.trim() !== '') {
        if (!validateComposition(values.composition)) {
          return;
        }
        // 解析为对象
        values.composition = JSON.parse(values.composition);
      } else {
        values.composition = null;
      }

      // 处理空字符串的情况
      if (values.deck_code === '') {
        values.deck_code = null;
      }
      if (values.description === '') {
        values.description = null;
      }

      // 获取当前用户信息
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        message.error("请先登录");
        return;
      }

      if (editingDeck) {
        // 编辑时只发送修改的字段
        const updatedValues = {
          name: values.name,
          environment_id: values.environment_id,
          description: values.description,
          composition: values.composition,
          deck_code: values.deck_code,
          author_id: values.author_id,  // 使用用户输入的作者信息
        };
        await api.put(
          `${API_ENDPOINTS.DECKS}${editingDeck.id}`,
          updatedValues
        );
      } else {
        // 创建时使用用户输入的作者信息
        await api.post(API_ENDPOINTS.DECKS, values);
      }
      setModalVisible(false);
      fetchDecks();
    } catch (error) {
      console.error('提交卡组失败:', error);
      
      try {
        if (error instanceof AxiosError && error.response?.data) {
          const errorData = error.response.data;
          let errorMessage = "操作失败";

          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => err.msg).join('\n');
            } else {
              errorMessage = errorData.detail;
            }
          } else if (errorData.non_field_errors) {
            errorMessage = errorData.non_field_errors[0];
          } else {
            // 处理字段错误
            const fieldErrors = Object.entries(errorData)
              .map(([field, errors]) => {
                try {
                  if (Array.isArray(errors)) {
                    return `${field}: ${errors[0]}`;
                  } else if (typeof errors === 'object' && errors !== null) {
                    // 处理嵌套的错误对象
                    if ('msg' in errors) {
                      return `${field}: ${errors.msg}`;
                    }
                    return `${field}: ${JSON.stringify(errors)}`;
                  }
                  return `${field}: ${String(errors)}`;
                } catch (e) {
                  console.error('处理错误信息失败:', e);
                  return `${field}: 未知错误`;
                }
              })
              .filter(Boolean)
              .join('\n');
            errorMessage = fieldErrors || "操作失败";
          }

          message.error(errorMessage);
        } else {
          message.error("操作失败，请稍后重试");
        }
      } catch (e) {
        console.error('处理错误失败:', e);
        message.error("操作失败，请稍后重试");
      }
    }
  };

  const handleView = (record: Deck) => {
    setViewingDeck(record);
    setViewModalVisible(true);
  };

  const handleCopyComposition = (composition: string | Card[] | undefined) => {
    const textToCopy = typeof composition === 'string' ? composition : JSON.stringify(composition, null, 2);
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        message.success('卡组构成已复制到剪贴板');
      },
      () => {
        message.error('复制失败，请手动复制');
      }
    );
  };

  const columns: TableProps<Deck>['columns'] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      responsive: ['xs'],
    },
    {
      title: "卡组名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "环境",
      dataIndex: "environment_id",
      key: "environment_id",
      render: (environmentId: number) => {
        const environment = environments.find((env) => env.id === environmentId);
        return environment ? environment.name : "-";
      },
    },
    {
      title: "作者",
      dataIndex: "author_id",
      key: "author_id",
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: Deck) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个卡组吗？"
            description="删除后将无法恢复，且相关的对局记录也会被删除。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="decks-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} justify="center">
        <Col xs={12} sm={12} md={6} lg={4}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ width: '100%' }}>
            创建卡组
          </Button>
        </Col>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Select
            style={{ width: "100%" }}
            placeholder="选择环境"
            allowClear
            onChange={(value) => setSelectedEnvironment(value)}
          >
            {environments.map((env) => (
              <Select.Option key={env.id} value={env.id}>
                {env.name}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={decks.filter(deck => !selectedEnvironment || deck.environment_id === selectedEnvironment)}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          responsive: true,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
      <Modal
        title={editingDeck ? "编辑卡组" : "创建卡组"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width="90%"
        style={{ maxWidth: '800px' }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="name"
                label="卡组名称"
                rules={[{ required: true, message: "请输入卡组名称" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="environment_id"
                label="环境"
                rules={[{ required: true, message: "请选择环境" }]}
              >
                <Select>
                  {environments.map((env) => (
                    <Select.Option key={env.id} value={env.id}>
                      {env.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="author_id"
            label="作者"
            rules={[{ required: true, message: "请输入作者" }]}
          >
            <Input placeholder="请输入作者名字" />
          </Form.Item>
          <Form.Item
            name="composition"
            label={
              <Space>
                <span>卡组构成</span>
                <Text type="secondary" style={{ fontSize: 12 }}></Text>
              </Space>
            }
          >
            <TextArea
              rows={6}
              placeholder="请输入卡组构成（模拟器JSON）"
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>
          <Form.Item name="deck_code" label="卡组码">
            <Input placeholder="请输入卡组码" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={4} placeholder="请输入卡组描述" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="卡组详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: '1000px' }}
        styles={{
          body: {
            padding: '24px'
          }
        }}
      >
        {viewingDeck && (
          <Descriptions 
            column={{ xs: 1, sm: 1, md: 2 }} 
            bordered 
            size="middle"
            labelStyle={{ 
              width: '120px',
              backgroundColor: '#fafafa',
              fontWeight: 500
            }}
            contentStyle={{ 
              padding: '16px 24px'
            }}
          >
            <Descriptions.Item label="卡组名称">{viewingDeck.name}</Descriptions.Item>
            <Descriptions.Item label="环境">
              {environments.find(env => env.id === viewingDeck.environment_id)?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="作者">{viewingDeck.author_id}</Descriptions.Item>
            <Descriptions.Item label="卡组码">{viewingDeck.deck_code || '-'}</Descriptions.Item>
            <Descriptions.Item 
              label={
                <Space>
                  <span>卡组构成</span>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyComposition(viewingDeck.composition)}
                    size="small"
                  >
                    复制
                  </Button>
                </Space>
              } 
              span={2}
            >
              <TextArea
                value={typeof viewingDeck.composition === 'string' ? viewingDeck.composition : JSON.stringify(viewingDeck.composition, null, 2)}
                autoSize={{ minRows: 6, maxRows: 12 }}
                readOnly
                style={{ 
                  fontFamily: "monospace",
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              <div style={{ 
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                fontSize: '14px'
              }}>
                {viewingDeck.description || '-'}
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Decks;
