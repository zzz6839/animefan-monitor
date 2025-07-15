# Auto Download

**Disclaimer:** This project was generated with the assistance of an AI programming assistant. While the code has been reviewed, it is provided as-is and may contain errors or inconsistencies.

This is an interactive anime auto download monitor to schedule monitor feed, send new task via RPC to remote downloader once rss feed updated.

## Deployment

The recommended way to deploy this application is with Docker Compose.

1.  Clone this repository.
2.  Create a `docker-compose.yml` file with the following content:

```yaml
version: '3.8'

services:
  backend:
    image: your-dockerhub-username/auto-download-backend:main
    ports:
      - "58000:58000"
    volumes:
      - ./backend_data:/app/data
    restart: unless-stopped

  frontend:
    image: your-dockerhub-username/auto-download-frontend:main
    ports:
      - "53000:53000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  backend_data:
```

3.  Replace `your-dockerhub-username` with your Docker Hub username.
4.  Run `docker-compose up -d` to start the application.

## Usage

1.  Open your web browser and navigate to `http://localhost:53000`.
2.  The first time you run the application, you will need to configure your Aria2 downloader settings. Click on the "下载器设置" (Downloader Settings) button to open the configuration modal.
3.  Once you have configured your downloader, you can create new automated download rules by clicking on the "新建自动下载规则" (New Automated Download Rule) button.

---

# 自动下载

**免责声明:** 本项目由 AI 编程助手协助生成。虽然代码已经过审查，但仍按原样提供，可能包含错误或不一致之处。

这是一个交互式的动漫自动下载监视器，用于安排监视 RSS 源，并在 RSS 源更新后通过 RPC 将新任务发送到远程下载器。

## 部署

推荐使用 Docker Compose 部署此应用程序。

1.  克隆此存储库。
2.  创建一个 `docker-compose.yml` 文件，内容如下：

```yaml
version: '3.8'

services:
  backend:
    image: your-dockerhub-username/auto-download-backend:main
    ports:
      - "58000:58000"
    volumes:
      - ./backend_data:/app/data
    restart: unless-stopped

  frontend:
    image: your-dockerhub-username/auto-download-frontend:main
    ports:
      - "53000:53000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  backend_data:
```

3.  将 `your-dockerhub-username` 替换为您的 Docker Hub 用户名。
4.  运行 `docker-compose up -d` 启动应用程序。

## 使用

1.  打开您的网络浏览器并访问 `http://localhost:53000`。
2.  首次运行该应用程序时，您需要配置您的 Aria2 下载器设置。点击“下载器设置”按钮打开配置模式窗口。
3.  配置完下载器后，您可以点击“新建自动下载规则”按钮创建新的自动下载规则。
