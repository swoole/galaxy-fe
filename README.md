# galaxy-fe

CodeGalaxy 的前端，基于 Vue 2 + Element UI 构建。

CodeGalaxy 是部署在用户自有环境中的研发管理平台，覆盖开发、构建、发布与容器编排管理。系统本身不代售云资源、不提供托管集群、也不包含支付与计费能力。后端服务见 [galaxy-api](../galaxy-api)。

## 环境要求

- Node.js >= 20
- npm >= 10

## 使用

```shell
# 安装依赖
npm install

# 开发调试（默认 http://localhost:9529）
npm run dev

# 构建工程
npm run build

# 单元测试
npm run test:unit
```

## Docker 使用

> 注意：以下命令中的 `hub.local` 仅为本地镜像仓库示例地址，请替换为你自己的镜像仓库地址（例如 `docker.io/your-org/galaxy-fe`）。

```shell
# depend install && build image
docker build -t hub.local/code-galaxy/galaxy-fe:latest .

# run
docker run --name galaxy-fe -p 8081:80 -d --restart=always hub.local/code-galaxy/galaxy-fe:latest
```

镜像内为 Nginx，构建产物位于 `/usr/share/nginx/html`。

### 构建参数

镜像构建时通过 `--build-arg` 注入前端环境变量：

| 构建参数 | 对应环境变量 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `baseapi` | `VUE_APP_BASE_API` | `/api/` | 后端 API 基础地址 |
| `staticprefix` | `VUE_APP_STATIC_PREFIX` | `/` | 静态资源公共路径，部署在子路径时需修改 |
| `VUE_APP_TRUSTED_DOMAINS` | 同名 | 空 | 登录成功后允许跳转的外域白名单，逗号分隔，支持 `*.example.com` |
| `VUE_APP_COOKIE_DOMAIN` | 同名 | 空 | 跨域 Cookie 写入的域名，如 `.example.com` |

> **安全提示**：`VUE_APP_TRUSTED_DOMAINS` 与 `VUE_APP_COOKIE_DOMAIN` 默认为空，此时会回落到 `src/settings.js` 中的 `*.code-galaxy.net`。其中 `VUE_APP_TRUSTED_DOMAINS` 决定了登录成功后哪些外域可以携带 `access_token` 被跳转过去，配置过宽会导致令牌泄露。**部署到你自己的环境时请务必显式指定这两个参数。**

示例：

```shell
docker build \
  --build-arg baseapi=https://api.example.com/ \
  --build-arg VUE_APP_TRUSTED_DOMAINS=example.com,*.example.com \
  --build-arg VUE_APP_COOKIE_DOMAIN=.example.com \
  -t your-registry/galaxy-fe:latest .
```

其余变量（如 `VUE_APP_OAUTH_CLIENT_LOGO`）通过 `.env.development` / `.env.production` / `.env.staging` 配置。

## 附录

### lang icon

lang icon from https://www.tiobe.com/tiobe-index/ .

## 许可证

Apache-2.0，详见 [LICENSE](LICENSE)。
