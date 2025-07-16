# Auto Download

**Disclaimer:** This project was generated with the assistance of an AI programming assistant. While the code has been reviewed, it may contain errors or inconsistencies.

This is an interactive anime auto download monitor to schedule monitor feed, send new task via RPC to remote downloader once rss feed updated.

enhanced design for mikan and nyaa.

## Deployment

The recommended way to deploy this application is with Docker Compose.

1.  Clone this repository.
2.  Run `docker-compose up -d` to start the application.

## Usage

1.  Open your web browser and navigate to `http://localhost:53000`.
2.  The first time you run the application, you will need to configure your Aria2 downloader settings. Click on the "下载器设置" (Downloader Settings) button to open the configuration modal.
3.  Once you have configured your downloader, you can create new automated download rules by clicking on the "新建自动下载规则" (New Automated Download Rule) button.

---

# 自动下载

**免责声明:** 本项目由 AI 编程助手协助生成。虽然代码已经过审查，但可能包含错误或不一致之处。

这是一个交互式的动漫自动下载监视器，用于安排监视 RSS 源，并在 RSS 源更新后通过 RPC 将新任务发送到远程下载器。

增强了 mikan 和 nyaa 的设计。

## 部署

推荐使用 Docker Compose 部署此应用程序。

1.  克隆此存储库。
2.  运行 `docker-compose up -d` 启动应用程序。

## 使用

1.  打开您的网络浏览器并访问 `http://localhost:53000`。
2.  首次运行该应用程序时，您需要配置您的 Aria2 下载器设置。点击“下载器设置”按钮打开配置模式窗口。
3.  配置完下载器后，您可以点击“新建自动下载规则”按钮创建新的自动下载规则。

## To-Do List

### 🎨 UI/UX Enhancements

- [ ] **Waifu Integration**
  - Add waifu to README
  - Add waifu to main page
  - Design and implement application logo with waifu

- [ ] **Custom Background & Theme System**
  - Allow users to upload custom background images
  - Implement background transparency controls
  - Add image zoom in/out functionality
  - Provide real-time preview during image upload
  - Create fully customizable theme system
  - Support for different background modes (cover, contain, repeat, etc.)

### 🐛 Bug Fixes

#### Low Priority
- [ ] **Edit Rule Page - Time Filter Bug**
  - BUG(low prior): "edit rule page" after applied 只下载指定时间之后的新资源(Only download new resources after the specified time), backend does not create correct download tasks after applied options

- [ ] **Monitor Interval Feature**
  - BUG(low): individual rule "监控间隔" (monitor interval) option not working

- [ ] **Main Page Layout**
  - BUG(low): Better main page layout optimization

