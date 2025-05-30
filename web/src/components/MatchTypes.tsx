import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Popconfirm,
  Switch,
  Typography,
  Tag,
  Tooltip,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";
import { MatchType } from "../types";
import { AxiosError } from "axios";
import type { TableProps } from 'antd';

const { Text } = Typography;

interface User {
  id: string;
  name: string;
  email: string;
}

const MatchTypes: React.FC = () => {
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [editingMatchType, setEditingMatchType] = useState<MatchType | null>(
    null
  );
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [form] = Form.useForm();
  const [joinForm] = Form.useForm();
  const location = useLocation();

  // 获取用户信息
  const fetchUsers = useCallback(
    async (userIds: string[], existingUsers: Record<string, User>) => {
      try {
        const uniqueIds = [...new Set(userIds)];
        const idsToFetch = uniqueIds.filter((id) => !existingUsers[id]);

        if (idsToFetch.length > 0) {
          const response = await api.post(`${API_ENDPOINTS.USERS}batch`, {
            user_ids: idsToFetch,
          });
          const newUsers = response.data.reduce(
            (acc: Record<string, User>, user: User) => {
              acc[user.id] = user;
              return acc;
            },
            {}
          );
          setUsers((prev) => ({ ...prev, ...newUsers }));
        }
      } catch (error) {
        console.error("获取用户信息失败", error);
      }
    },
    []
  );

  const fetchMatchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES, {
        withCredentials: true, // 确保发送认证信息
      });
      setMatchTypes(response.data);
    } catch (error) {
      console.error("获取比赛类型列表失败", error);
      message.error("获取比赛类型列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      setIsAdmin(response.data.is_admin);
      setCurrentUserId(response.data.user_id);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // 监听比赛类型变化，更新用户信息
  useEffect(() => {
    if (matchTypes.length > 0) {
      const allUserIds = matchTypes.flatMap((mt) => mt.users || []);
      if (allUserIds.length > 0) {
        fetchUsers(allUserIds, users);
      }
    }
  }, [matchTypes, fetchUsers, users]);

  // 监听路由变化
  useEffect(() => {
    if (location.pathname === "/match-types") {
      fetchMatchTypes();
      checkAdminStatus();
    }
  }, [location.pathname, fetchMatchTypes, checkAdminStatus]);

  const handleCreate = () => {
    setEditingMatchType(null);
    form.resetFields();
    // 如果不是管理员，默认设置为私有类型
    if (!isAdmin) {
      form.setFieldsValue({ is_private: true });
    }
    setModalVisible(true);
  };

  const handleEdit = (record: MatchType) => {
    // 检查权限
    if (!isAdmin && record.creator_id !== currentUserId) {
      message.warning("您只能编辑自己创建的对局类型");
      return;
    }
    setEditingMatchType(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    const matchType = matchTypes.find(mt => mt.id === id);
    if (!matchType) return;

    // 检查权限
    if (!isAdmin && matchType.creator_id !== currentUserId) {
      message.warning("您只能删除自己创建的对局类型");
      return;
    }

    try {
      await api.delete(`${API_ENDPOINTS.MATCH_TYPES}${id}/`);
      message.success("删除成功");
      fetchMatchTypes();
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error("删除失败");
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 如果不是管理员，强制设置为私有类型
      if (!isAdmin) {
        values.is_private = true;
      }

      if (editingMatchType) {
        // 如果不是管理员，只允许修改名称
        if (!isAdmin) {
          values.is_private = editingMatchType.is_private;
        }
        await api.put(
          `${API_ENDPOINTS.MATCH_TYPES}/${editingMatchType.id}`,
          values
        );
        message.success("更新成功");
      } else {
        await api.post(API_ENDPOINTS.MATCH_TYPES, values);
        message.success("创建成功");
      }
      setModalVisible(false);
      fetchMatchTypes();
    } catch {
      message.error("操作失败");
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      message.success("邀请码已复制到剪贴板");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  const handleJoin = async () => {
    try {
      const values = await joinForm.validateFields();
      await api.post(`${API_ENDPOINTS.MATCH_TYPES}join`, values);
      message.success("成功加入比赛类型");
      setJoinModalVisible(false);
      joinForm.resetFields();
      fetchMatchTypes();
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error("加入失败");
      }
    }
  };

  const renderUserList = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return null;

    const displayCount = 3; // 默认显示的用户数量
    const displayUsers = userIds.slice(0, displayCount);
    const remainingCount = userIds.length - displayCount;

    return (
      <Space size={4}>
        {displayUsers.map((userId) => (
          <Tag key={userId}>{users[userId]?.name || userId}</Tag>
        ))}
        {remainingCount > 0 && (
          <Tooltip
            title={userIds
              .slice(displayCount)
              .map((userId) => users[userId]?.name || userId)
              .join(", ")}
          >
            <Tag icon={<TeamOutlined />}>+{remainingCount}</Tag>
          </Tooltip>
        )}
      </Space>
    );
  };

  const columns: TableProps<MatchType>['columns'] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      responsive: ['xs'],
    },
    {
      title: "比赛类型名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "类型",
      key: "is_private",
      width: 100,
      render: (_: unknown, record: MatchType) => (
        <Text>{record.is_private ? "私有" : "公开"}</Text>
      ),
    },
    {
      title: "邀请码",
      key: "invite_code",
      width: 200,
      responsive: ['md'],
      render: (_: unknown, record: MatchType) =>
        record.is_private && record.invite_code ? (
          <Space>
            <Text code>{record.invite_code}</Text>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyInviteCode(record.invite_code!)}
            />
          </Space>
        ) : null,
    },
    {
      title: "成员",
      key: "users",
      width: 300,
      responsive: ['lg'],
      render: (_: unknown, record: MatchType) =>
        record.is_private ? renderUserList(record.users) : null,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: MatchType) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个比赛类型吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
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
    <div className="match-types-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={24}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建比赛类型
            </Button>
            <Button onClick={() => setJoinModalVisible(true)}>
              加入比赛类型
            </Button>
          </Space>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={matchTypes}
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
        title={editingMatchType ? "编辑比赛类型" : "创建比赛类型"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width="90%"
        style={{ maxWidth: '500px' }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="比赛类型名称"
            rules={[{ required: true, message: "请输入比赛类型名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="is_private"
            label="私有类型"
            valuePropName="checked"
            tooltip={
              !isAdmin
                ? editingMatchType
                  ? "普通用户不能修改对局类型的私有属性"
                  : "普通用户只能创建私有类型"
                : undefined
            }
          >
            <Switch disabled={!isAdmin} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="加入比赛类型"
        open={joinModalVisible}
        onOk={handleJoin}
        onCancel={() => setJoinModalVisible(false)}
        destroyOnClose
        width="90%"
        style={{ maxWidth: '500px' }}
      >
        <Form form={joinForm} layout="vertical">
          <Form.Item
            name="invite_code"
            label="邀请码"
            rules={[{ required: true, message: "请输入邀请码" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchTypes;
