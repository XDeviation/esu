import React from 'react';
import { Tabs } from 'antd';
import Environments from './Environments';
import Decks from './Decks';
import PriorKnowledgeTable from './PriorKnowledgeTable';

const AdminPanel: React.FC = () => {
  const items = [
    {
      key: 'environments',
      label: '环境管理',
      children: <Environments />,
    },
    {
      key: 'decks',
      label: '卡组管理',
      children: <Decks />,
    },
    {
      key: 'prior-knowledge',
      label: '先验数据',
      children: <PriorKnowledgeTable />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>管理面板</h1>
      <Tabs
        defaultActiveKey="environments"
        items={items}
        style={{ marginTop: '16px' }}
      />
    </div>
  );
};

export default AdminPanel; 