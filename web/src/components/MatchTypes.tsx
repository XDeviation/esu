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
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";

interface MatchType {
  id: number;
  name: string;
}

const MatchTypes: React.FC = () => {
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMatchType, setEditingMatchType] = useState<MatchType | null>(
    null
  );
  const [form] = Form.useForm();
  const location = useLocation();

  const fetchMatchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.MATCH_TYPES);
      setMatchTypes(response.data);
    } catch {
      message.error("获取比赛类型列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 监听路由变化
  useEffect(() => {
    if (location.pathname === "/match-types") {
      fetchMatchTypes();
    }
  }, [location.pathname, fetchMatchTypes]);

  const handleCreate = () => {
    setEditingMatchType(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: MatchType) => {
    setEditingMatchType(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.MATCH_TYPES}/${id}`);
      message.success("删除成功");
      fetchMatchTypes();
    } catch {
      message.error("删除失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingMatchType) {
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

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "比赛类型名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: MatchType) => (
        <Space>
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
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建比赛类型
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={matchTypes}
        rowKey="id"
        loading={loading}
      />
      <Modal
        title={editingMatchType ? "编辑比赛类型" : "创建比赛类型"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="比赛类型名称"
            rules={[{ required: true, message: "请输入比赛类型名称" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchTypes;
