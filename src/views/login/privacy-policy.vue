<template>
  <div class="policy-page">
    <div class="policy-card">
      <h1>CodeGalaxy 隐私说明</h1>
      <p class="updated">适用于当前自托管工具版本</p>

      <h2>1. 产品边界</h2>
      <p>CodeGalaxy 是部署在您自有环境中的开发、构建和 Docker Swarm 管理工具，不提供付费云资源、托管集群、托管 Git 或托管镜像仓库。系统运营方应根据自身部署方式确定并公示实际的数据管理责任。</p>

      <h2>2. 系统处理的数据</h2>
      <ul>
        <li>账户信息：登录邮箱、密码摘要、昵称、头像及必要的组织和权限关系。</li>
        <li>运行数据：项目、仓库、流水线、镜像、发布、集群、域名路由和证书配置。</li>
        <li>安全与审计数据：登录记录、操作日志、任务日志、错误信息及必要的客户端网络信息。</li>
        <li>通知数据：用于发送验证码和系统通知的邮箱地址。</li>
      </ul>
      <p>当前产品不要求手机号、短信验证码、支付账户、发票资料或实名认证材料。</p>

      <h2>3. 外部系统访问</h2>
      <p>只有在用户主动配置后，CodeGalaxy 才会访问 Docker API、Git 仓库、镜像仓库、SMTP、证书服务商或其他外部服务。相关数据传输受用户选择的网络协议和外部服务条款约束。</p>

      <h2>4. 凭据与敏感配置</h2>
      <p>Git Token、镜像仓库密码、Docker TLS 私钥、项目 Secret 等属于敏感信息。系统仅在完成用户请求所必需的范围内使用这些信息；部署者应配置访问控制、HTTPS、备份和密钥轮换，并限制数据库及 Redis 的访问范围。</p>

      <h2>5. 数据保留与删除</h2>
      <p>数据保留周期由自托管系统的管理员决定。删除账户、项目、运行实例或集群配置前，界面会展示关联资源；日志、备份和外部系统中的副本可能需要管理员按其运维策略另行处理。</p>

      <h2>6. 联系方式</h2>
      <p>如需查询、更正或删除数据，请联系当前 CodeGalaxy 实例的系统管理员。</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PrivacyPolicy'
}
</script>

<style lang="scss" scoped>
.policy-page { min-height: 100%; padding: 40px 20px; background: #f5f7fa; color: #303133; }
.policy-card { max-width: 920px; margin: 0 auto; padding: 36px 48px; background: #fff; border-radius: 8px; line-height: 1.8; box-shadow: 0 2px 12px rgba(0, 0, 0, .08); }
h1 { margin: 0; text-align: center; }
h2 { margin-top: 28px; font-size: 18px; }
.updated { text-align: center; color: #909399; }
li { margin: 6px 0; }
</style>
