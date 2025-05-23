# Shadowverse: Evolve 胜率统计系统

这是一个用于统计和分析 Shadowverse: Evolve 卡组胜率的 Web 应用程序。

## 功能特点

- 实时卡组胜率统计
- 环境演化分析
- 加权胜率计算
- 多环境支持

## 技术栈

- 前端：React + TypeScript + Ant Design
- 后端：Python
- 数据库：PostgreSQL

## 安装说明

1. 克隆仓库
```bash
git clone https://github.com/yourusername/esu.git
cd esu
```

2. 安装前端依赖
```bash
cd web
npm install
```

3. 安装后端依赖
```bash
cd ../server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. 配置环境变量
复制 `config.yaml.example` 到 `config.yaml` 并填写必要的配置信息。

## 运行说明

1. 启动后端服务
```bash
cd server
python app.py
```

2. 启动前端开发服务器
```bash
cd web
npm start
```

## 贡献指南

欢迎提交 Pull Request 或创建 Issue 来帮助改进项目。

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件
