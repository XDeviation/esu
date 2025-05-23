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
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";
import { UserRole } from "../types";

interface MatchType {
  id: number;
  name: string;
  require_permission: boolean;
}

interface MatchTypeFormData {
  name: string;
  require_permission: boolean;
}

const MatchTypes: React.FC = () => {
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [userRole, setUserRole] = useState<UserRole>(UserRole.PLAYER);

  const fetchMatchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch (error) {
      message.error("获取比赛类型失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.USERS_ME);
      setUserRole(response.data.role);
    } catch (error) {
      console.error("获取用户信息失败:", error);
    }
  }, []);

  useEffect(() => {
    fetchMatchTypes();
    fetchUserInfo();
  }, [fetchMatchTypes, fetchUserInfo]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: MatchType) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.MATCH_TYPES}${id}`);
      message.success("删除成功");
      fetchMatchTypes();
    } catch (error) {
      message.error("删除失败");
    }
  };

  const handleSubmit = async (values: MatchTypeFormData) => {
    try {
      if (editingId) {
        await api.put(`${API_ENDPOINTS.MATCH_TYPES}${editingId}`, values);
        message.success("更新成功");
      } else {
        await api.post(API_ENDPOINTS.MATCH_TYPES, values);
        message.success("添加成功");
      }
      setModalVisible(false);
      fetchMatchTypes();
    } catch (error) {
      message.error(editingId ? "更新失败" : "添加失败");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      align: "center" as const,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "需要权限",
      dataIndex: "require_permission",
      key: "require_permission",
      width: 100,
      align: "center" as const,
      render: (require_permission: boolean) => (
        <span>{require_permission ? "是" : "否"}</span>
      ),
      hidden: userRole === UserRole.PLAYER,
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      align: "center" as const,
      hidden: userRole === UserRole.PLAYER,
      render: (_: any, record: MatchType) => (
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
  ].filter(column => !column.hidden);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {userRole !== UserRole.PLAYER && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加比赛类型
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={matchTypes}
        rowKey="id"
        loading={loading}
        scroll={{ x: 520 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
      <Modal
        title={editingId ? "编辑比赛类型" : "添加比赛类型"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入比赛类型名称" }]}
          >
            <Input />
          </Form.Item>
          {userRole !== UserRole.PLAYER && (
            <Form.Item
              name="require_permission"
              label="需要权限"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingId ? "更新" : "添加"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchTypes;
