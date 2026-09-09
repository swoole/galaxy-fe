<template>
  <div class="terms-page">
    <div class="terms-card">
      <h1>CodeGalaxy 使用条款</h1>
      <p class="updated">适用于当前自托管工具版本</p>

      <h2>1. 服务内容</h2>
      <p>CodeGalaxy 提供 Web IDE、外部 Git 仓库集成、镜像构建、Docker Swarm 发布、Web 网关、证书和监控管理能力。产品不销售或托管计算资源、集群、Git 仓库、镜像仓库、DNS 或四层负载均衡。</p>

      <h2>2. 用户负责的基础设施</h2>
      <p>用户负责准备并维护 Docker Swarm、存储、网络、DNS、四层代理、Git、镜像仓库及其他外部服务，并确保拥有相应的账户权限、软件许可和数据处理授权。</p>

      <h2>3. 高风险操作</h2>
      <p>发布 Service、执行容器终端、修改网关、上传私钥以及使用 Bind Mount 都可能影响集群安全。挂载 Docker/containerd Socket 或宿主机系统目录，可能使容器获得节点乃至整个集群的控制权限。平台会进行风险提示和二次确认，但最终决定和后果由具有权限的操作者承担。</p>

      <h2>4. 凭据与网络安全</h2>
      <p>用户应优先使用 TLS 连接 Docker API、Git 和镜像仓库，妥善保管 Token、密码、私钥和 Secret，并按需轮换。选择明文 HTTP、关闭证书校验或授予高权限时，应自行评估所在网络和信任边界。</p>

      <h2>5. 开源软件与外部服务</h2>
      <p>项目市场中的镜像和外部服务由各自提供者维护，适用其许可证、隐私政策和使用条款。安装前应核验镜像来源、版本、配置和已知安全风险。</p>

      <h2>6. 数据与备份</h2>
      <p>用户应为数据库、代码仓库、镜像、Volume、证书和配置建立独立备份。删除、回滚、更新或集群故障可能造成业务中断或数据损失。</p>

      <h2>7. 变更</h2>
      <p>随着功能演进，本说明可能更新。系统管理员应在升级前审阅迁移文档、配置差异和风险提示。</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServiceContract'
}
</script>

<style lang="scss" scoped>
.terms-page { min-height: 100%; padding: 40px 20px; background: #f5f7fa; color: #303133; }
.terms-card { max-width: 920px; margin: 0 auto; padding: 36px 48px; background: #fff; border-radius: 8px; line-height: 1.8; box-shadow: 0 2px 12px rgba(0, 0, 0, .08); }
h1 { margin: 0; text-align: center; }
h2 { margin-top: 28px; font-size: 18px; }
.updated { text-align: center; color: #909399; }
</style>
