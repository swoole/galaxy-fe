# cloud-fe

CodeGalaxy前端

# 使用

```shell
# 安装依赖
npm install

# 开发调试
npm run dev

# 构建工程
npm run build
```

# Docker使用

> 注意：以下命令中的 `hub.local` 仅为本地镜像仓库示例地址，请替换为你自己的镜像仓库地址（例如 `docker.io/your-org/cloud-fe`）。

```shell
# depend install && build image
docker build -t hub.local/code-galaxy/cloud-fe:latest-test .

# run
docker run --name cloud-fe-test -p 8081:80 -d --restart=always hub.local/code-galaxy/cloud-fe:latest-test
```

# 附录

## lang icon

lang icon from https://www.tiobe.com/tiobe-index/ .
