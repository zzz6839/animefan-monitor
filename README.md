# Anime Fan Monitor | 动漫迷监控器

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

Anime Fan Monitor is a web-based tool that helps you automatically monitor and download anime through RSS feeds using a remote Aria2 downloader. It provides a user-friendly interface to manage download rules and monitor download progress.

### Features

- 🔄 Automatic RSS feed monitoring
- 📺 Filter downloads by subtitle groups
- ⚡ Send download tasks to remote Aria2 server
- 🕒 Customizable monitoring intervals
- 🛠️ Easy configuration through web UI
- 🐳 Simple deployment with Docker

### Prerequisites

- Docker and Docker Compose installed on your system
- A remote Aria2 server with RPC enabled
- Anime RSS feed URLs

### Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/animefan-monitor.git
   cd animefan-monitor
   ```

2. Start the application:
   ```bash
   docker compose up -d
   ```

3. Open your browser and navigate to:
   - Web Interface: `http://localhost:5173`
   - API Documentation: `http://localhost:8000/docs`

4. Configure your Aria2 downloader settings through the web interface by clicking the "Download Settings" button.

### Usage

1. **Configure Aria2:**
   - Enter your remote Aria2 server details (host, port, RPC path)
   - Set your secret token (if configured on Aria2)
   - Test the connection

2. **Create Download Rules:**
   - Click "New Automated Download Rule"
   - Enter RSS feed URL
   - Configure filters (subtitle groups, file size, etc.)
   - Save the rule

3. **Monitor Downloads:**
   - Enable/disable rules from the main dashboard
   - View download progress
   - Preview available items from RSS feeds

---

<a name="chinese"></a>
## 中文

动漫迷监控器是一个基于Web的工具，通过RSS订阅源和远程Aria2下载器帮助您自动监控和下载动漫。它提供了一个用户友好的界面来管理下载规则和监控下载进度。

### 功能特点

- 🔄 自动RSS订阅源监控
- 📺 字幕组过滤下载
- ⚡ 发送下载任务至远程Aria2服务器
- 🕒 可自定义监控时间间隔
- 🛠️ 通过网页界面轻松配置
- 🐳 使用Docker简单部署

### 系统要求

- 系统已安装Docker和Docker Compose
- 已启用RPC的远程Aria2服务器
- 动漫RSS订阅源URL

### 快速开始

1. 克隆此仓库：
   ```bash
   git clone https://github.com/yourusername/animefan-monitor.git
   cd animefan-monitor
   ```

2. 启动应用：
   ```bash
   docker compose up -d
   ```

3. 打开浏览器访问：
   - 网页界面：`http://localhost:5173`
   - API文档：`http://localhost:8000/docs`

4. 通过点击"下载器设置"按钮配置您的Aria2下载器设置。

### 使用说明

1. **配置Aria2：**
   - 输入您的远程Aria2服务器详情（主机、端口、RPC路径）
   - 设置密钥令牌（如果Aria2已配置）
   - 测试连接

2. **创建下载规则：**
   - 点击"新建自动下载规则"
   - 输入RSS订阅源URL
   - 配置过滤器（字幕组、文件大小等）
   - 保存规则

3. **监控下载：**
   - 在主面板启用/禁用规则
   - 查看下载进度
   - 预览RSS订阅源中的可用项目

### AI免责声明 | AI Disclaimer

This project was developed with the assistance of AI. While the core functionality and implementation were designed and reviewed by humans, some parts of the code, documentation, and configuration files were generated or enhanced using AI tools.

此项目是在AI的协助下开发的。虽然核心功能和实现是由人类设计和审查的，但代码、文档和配置文件的某些部分是使用AI工具生成或增强的。

### 许可证 | License

MIT License - feel free to use this project for your personal or commercial purposes.

MIT许可证 - 您可以自由地将此项目用于个人或商业用途。

*注意：此项目仅用于教育目的。请遵守内容提供商的版权法和服务条款。*

*Note: This project is for educational purposes only. Please respect copyright laws and terms of service of the content providers.*
