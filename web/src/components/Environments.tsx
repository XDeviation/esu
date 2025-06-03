import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  Row,
  Col,
  App,
} from "antd";
import type { TableProps } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { useLocation } from "react-router-dom";

interface Environment {
  id: number;
  name: string;
}

const Environments: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnvironment, setEditingEnvironment] =
    useState<Environment | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form] = Form.useForm();
  const location = useLocation();
  const { message } = App.useApp();

  const fetchEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ENVIRONMENTS);
      setEnvironments(response.data);
    } catch {
      message.error("获取环境列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHECK_ADMIN);
      setIsAdmin(response.data.is_admin);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // 监听路由变化
  useEffect(() => {
    if (location.pathname === "/environments") {
      fetchEnvironments();
      checkAdminStatus();
    }
  }, [location.pathname, fetchEnvironments, checkAdminStatus]);

  const handleCreate = () => {
    if (!isAdmin) {
      message.warning("只有管理员能够创建环境。如有需要请联系管理员");
      return;
    }
    setEditingEnvironment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Environment) => {
    if (!isAdmin) {
      message.warning("只有管理员能够编辑环境。如有需要请联系管理员");
      return;
    }
    setEditingEnvironment(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      message.warning("只有管理员能够删除环境。如有需要请联系管理员");
      return;
    }
    try {
      await api.delete(`${API_ENDPOINTS.ENVIRONMENTS}/${id}`);
      message.success("删除成功");
      fetchEnvironments();
    } catch {
      message.error("删除失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingEnvironment) {
        await api.put(
          `${API_ENDPOINTS.ENVIRONMENTS}/${editingEnvironment.id}`,
          values
        );
        message.success("更新成功");
      } else {
        await api.post(API_ENDPOINTS.ENVIRONMENTS, values);
        message.success("创建成功");
      }
      setModalVisible(false);
      fetchEnvironments();
    } catch {
      message.error("操作失败");
    }
  };

  const columns: TableProps<Environment>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      responsive: ["xs"],
    },
    {
      title: "环境名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: Environment) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个环境吗？"
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
    <div className="environments-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={24} md={24} lg={24}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建环境
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={environments}
        rowKey="id"
        loading={loading}
        scroll={{ x: "max-content" }}
        pagination={{
          responsive: true,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
      <Modal
        title={editingEnvironment ? "编辑环境" : "创建环境"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width="90%"
        style={{ maxWidth: "500px" }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="环境名称"
            rules={[{ required: true, message: "请输入环境名称" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Environments;
