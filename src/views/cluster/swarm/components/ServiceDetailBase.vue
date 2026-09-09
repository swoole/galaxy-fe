<template>
  <div class="swarm-service-detail" v-loading="loading">
    <component :is="breadcrumbComponent" :breadcrumb="breadcrumb" v-bind="breadcrumbSubject" />

    <!-- 回滚状态告警 -->
    <el-alert
      v-if="rollbackAlert"
      :title="rollbackAlert.title"
      :type="rollbackAlert.type"
      :description="rollbackAlert.description"
      :closable="false"
      show-icon
      class="rollback-alert"
    />

    <!-- 页头 + 操作栏 -->
    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <div class="service-title">
          <h2 class="service-name">{{ serviceName }}</h2>
          <el-tag v-if="service" size="small" :type="service.mode === 'global' ? 'primary' : 'info'">{{ service.mode }}</el-tag>
          <span v-if="service" class="service-meta">版本 {{ service.version }}</span>
          <span v-if="service" class="service-meta">创建于 {{ formatDateTime(service.created_at) }}</span>
        </div>
        <el-button size="small" icon="el-icon-back" @click="goBack">返回列表</el-button>
      </div>

      <div class="ops-bar" v-if="service">
        <template v-if="canOperate">
          <el-button size="small" icon="el-icon-s-data" :disabled="service.mode === 'global'" @click="toggleScale">伸缩</el-button>
          <el-button size="small" icon="el-icon-refresh" @click="doForceUpdate">{{ projectMode ? '滚动重启' : '强制更新' }}</el-button>
          <el-button v-if="!projectMode" size="small" icon="el-icon-back" @click="doRollback">回滚</el-button>
          <el-button
            v-if="canOperate && containerStoppedCount > 0"
            size="small"
            type="warning"
            plain
            :loading="containerCleanupLoading"
            @click="doCleanupStoppedContainers">
            清理已停止容器
          </el-button>
        </template>
        <el-button size="small" icon="el-icon-document" @click="openLogs">日志</el-button>
        <template v-if="canOperate">
          <el-button
            v-if="!projectMode || canDestroy"
            size="small"
            icon="el-icon-delete"
            type="danger"
            plain
            @click="doRemove">{{ projectMode ? '销毁 Service' : '删除' }}</el-button>
        </template>
      </div>

      <!-- 伸缩 -->
      <div v-if="showScale" class="inline-section">
        <span class="inline-label">副本数：{{ currentReplicas }} → {{ scaleReplicas }}</span>
        <el-slider
          v-model="scaleReplicas"
          :min="0"
          :max="scaleMax"
          :marks="scaleMarks"
          show-input
          class="scale-slider" />
        <div style="margin-top: 8px">
          <el-button size="small" type="primary" :loading="scaleLoading" @click="doScale">确认</el-button>
          <el-button size="small" @click="showScale = false">取消</el-button>
        </div>
      </div>

    </el-card>

    <!-- 详情 Tabs -->
    <el-card v-if="service" shadow="never" class="content-card">
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Service ID" :span="2">
              <span class="mono">{{ service.id }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="名称">{{ service.name }}</el-descriptions-item>
            <el-descriptions-item label="镜像">
              <image-reference
                :value="service.image"
                :org-id="orgId"
                :cluster-id="clusterId" />
              <el-button
                v-if="canOperate && !projectMode"
                type="text"
                size="small"
                icon="el-icon-edit"
                style="margin-left: 6px"
                @click="startEditImage">修改</el-button>
            </el-descriptions-item>
            <el-descriptions-item label="模式">
              <el-tag size="small" :type="service.mode === 'global' ? 'primary' : 'info'">{{ service.mode }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="副本数">{{ service.replicas !== null ? service.replicas : 'N/A (global)' }}</el-descriptions-item>
            <el-descriptions-item label="版本">{{ service.version }}</el-descriptions-item>
            <el-descriptions-item label="可回滚">
              <el-tag size="small" :type="service.has_previous_spec ? 'success' : 'info'">{{ service.has_previous_spec ? '是' : '否' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="更新状态">
              <el-tag v-if="service.update_status && service.update_status.state" size="small" :type="updateStatusTagType">{{ updateStatusLabel }}</el-tag>
              <span v-else class="cell-sub">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(service.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(service.updated_at) }}</el-descriptions-item>
            <el-descriptions-item label="Hostname">{{ service.hostname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="用户">{{ service.user || 'root' }}</el-descriptions-item>
            <el-descriptions-item label="工作目录">{{ service.working_dir || '/' }}</el-descriptions-item>
            <el-descriptions-item label="Stop Grace Period">{{ service.stop_grace_period || '-' }}</el-descriptions-item>
            <el-descriptions-item label="TTY">{{ service.tty ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item label="Init">{{ service.init ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">启动命令</el-divider>
          <div v-if="service.entrypoint" class="code-block">
            <span class="code-label">ENTRYPOINT</span>
            <code>{{ service.entrypoint }}</code>
          </div>
          <div v-if="service.cmd" class="code-block">
            <span class="code-label">CMD</span>
            <code>{{ service.cmd }}</code>
          </div>
          <div v-if="!service.cmd && !service.entrypoint" class="cell-sub">使用镜像默认命令</div>
        </el-tab-pane>

        <el-tab-pane label="环境变量" name="env">
          <div v-if="service">
            <div v-if="!envEditing">
              <div style="margin-bottom: 10px">
                <el-button v-if="canOperate" size="small" icon="el-icon-edit" @click="startBulkEdit">批量编辑</el-button>
              </div>
              <el-table
                v-if="service.env && service.env.length"
                :data="serviceEnvRows"
                border
                size="small"
                class="sub-table"
                max-height="340">
                <el-table-column label="变量" min-width="240">
                  <template #default="{ row: e }"><code class="mono env-key">{{ e.key }}</code></template>
                </el-table-column>
                <el-table-column label="值" min-width="260">
                  <template #default="{ row: e }"><code class="mono env-val">{{ e.val || '-' }}</code></template>
                </el-table-column>
              </el-table>
              <div v-else class="cell-sub">-</div>
            </div>
            <div v-else>
              <div style="margin-bottom: 8px; color: #909399; font-size: 13px">每行一个环境变量，格式：KEY=VALUE</div>
              <el-input
                v-model="envText"
                type="textarea"
                :rows="12"
                placeholder="APP_ENV=production&#10;APP_DEBUG=false"
                style="font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; font-size: 13px" />
              <div style="margin-top: 10px">
                <el-button size="small" type="primary" :loading="envSaving" @click="saveEnv">保存</el-button>
                <el-button size="small" @click="cancelEnvEdit">取消</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="资源" name="resources">
          <resource-config-editor
            v-model="serviceResources"
            :disabled="resourceLoading || !canOperate" />
          <div class="resource-actions">
            <el-button
              v-if="canOperate"
              size="small"
              type="primary"
              :loading="resourceLoading"
              @click="doUpdateResources">
              保存资源配置
            </el-button>
          </div>

          <el-divider content-position="left">重启策略</el-divider>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="条件">{{ service.restart_policy.condition }}</el-descriptions-item>
            <el-descriptions-item label="最大重试">{{ service.restart_policy.max_attempts || '无限制' }}</el-descriptions-item>
            <el-descriptions-item label="延迟">{{ service.restart_policy.delay || '-' }}</el-descriptions-item>
            <el-descriptions-item label="窗口">{{ service.restart_policy.window || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="挂载" name="mounts">
          <div v-if="!mountsEditing" style="margin-bottom: 10px">
            <el-button v-if="canOperate && !projectMode" size="small" icon="el-icon-edit" @click="startEditMounts">编辑</el-button>
          </div>
          <template v-if="mountsEditing">
            <el-table :data="editingMounts" border size="small" class="sub-table">
              <el-table-column label="类型" width="112">
                <template #default="{ row: m }">
                  <el-select v-model="m.type" size="small" style="width: 90px">
                    <el-option label="bind" value="bind" />
                    <el-option label="volume" value="volume" />
                    <el-option label="tmpfs" value="tmpfs" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="源路径" min-width="220">
                <template #default="{ row: m, $index: i }">
                  <template v-if="m.type === 'volume'">
                    <el-select
                      v-model="m.source"
                      size="small"
                      filterable
                      allow-create
                      placeholder="选择或输入卷名称"
                      style="width: 170px"
                      :loading="volumesLoading">
                      <el-option v-for="v in availableVolumes" :key="v.name" :label="v.name" :value="v.name" />
                    </el-select>
                    <el-button
                      size="mini"
                      type="text"
                      icon="el-icon-plus"
                      :loading="creatingVolume"
                      style="margin-left: 4px"
                      @click="doCreateVolume(i)">新建</el-button>
                  </template>
                  <el-input v-else v-model="m.source" size="small" :placeholder="m.type === 'bind' ? '/host/path' : ''" />
                </template>
              </el-table-column>
              <el-table-column label="目标路径" min-width="180">
                <template #default="{ row: m }">
                  <el-input v-model="m.target" size="small" placeholder="/container/path" />
                </template>
              </el-table-column>
              <el-table-column label="只读" width="70" align="center">
                <template #default="{ row: m }">
                  <el-switch v-model="m.readonly" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="60" align="center">
                <template #default="{ $index: i }">
                  <el-button size="mini" type="text" icon="el-icon-delete" style="color: #f56c6c" @click="removeMount(i)" />
                </template>
              </el-table-column>
            </el-table>
            <div style="margin-top: 8px">
              <el-button size="small" icon="el-icon-plus" @click="addMount">添加挂载</el-button>
              <el-button size="small" type="primary" :loading="mountsSaving" @click="saveMounts">保存</el-button>
              <el-button size="small" @click="cancelEditMounts">取消</el-button>
            </div>
          </template>
          <template v-else>
            <el-table v-if="service.mounts && service.mounts.length" :data="service.mounts" border size="small" class="sub-table">
              <el-table-column label="类型" prop="type" width="70" />
              <el-table-column label="源路径" min-width="180">
                <template #default="{ row: m }"><code class="mono">{{ m.source || '-' }}</code></template>
              </el-table-column>
              <el-table-column label="目标路径" min-width="180">
                <template #default="{ row: m }"><code class="mono">{{ m.target }}</code></template>
              </el-table-column>
              <el-table-column label="只读" width="60" align="center">
                <template #default="{ row: m }">
                  <el-tag size="small" :type="m.readonly ? 'warning' : 'success'">{{ m.readonly ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div v-else class="cell-sub">-</div>
          </template>
        </el-tab-pane>

        <el-tab-pane label="网络与端口" name="networks">
          <el-divider content-position="left">端口</el-divider>
          <el-table v-if="service.ports && service.ports.length" :data="service.ports" border size="small" class="sub-table">
            <el-table-column label="发布端口" prop="published_port" width="100" />
            <el-table-column label="目标端口" prop="target_port" width="100" />
            <el-table-column label="协议" prop="protocol" width="80" />
            <el-table-column label="发布模式" prop="publish_mode" width="100" />
          </el-table>
          <div v-else class="cell-sub">无对外端口</div>

          <template v-if="canOperate">
            <el-divider content-position="left">变更端口</el-divider>
            <div v-loading="portsSaving">
              <div v-for="(p, i) in editingPorts" :key="i" class="port-edit-row">
                <span class="port-label">发布</span>
                <el-input-number v-model="p.published_port" :min="1" :max="65535" size="small" style="width: 110px" />
                <span class="port-label">目标</span>
                <el-input-number v-model="p.target_port" :min="1" :max="65535" size="small" style="width: 110px" />
                <el-select v-model="p.protocol" size="small" style="width: 75px">
                  <el-option label="TCP" value="tcp" />
                  <el-option label="UDP" value="udp" />
                </el-select>
                <el-select v-model="p.publish_mode" size="small" style="width: 95px">
                  <el-option label="ingress" value="ingress" />
                  <el-option label="host" value="host" />
                </el-select>
                <el-button size="mini" type="text" icon="el-icon-delete" style="color: #f56c6c" @click="removePort(i)" />
              </div>
              <el-button size="small" icon="el-icon-plus" style="margin-bottom: 8px" @click="addPort">添加端口</el-button>
              <div>
                <el-button size="small" type="primary" :loading="portsSaving" @click="savePorts">确认</el-button>
                <el-button size="small" @click="resetPorts">取消</el-button>
              </div>
            </div>
          </template>

          <el-divider content-position="left">Overlay 网络</el-divider>
          <el-table v-if="service.networks && service.networks.length" :data="service.networks" border size="small" class="sub-table">
            <el-table-column label="网络" prop="target">
              <template #default="{ row: n }">
                <strong>{{ n.name || n.target }}</strong>
                <div v-if="n.name && n.target !== n.name" class="cell-sub mono">{{ n.target }}</div>
              </template>
            </el-table-column>
            <el-table-column label="别名" min-width="180">
              <template #default="{ row: n }">
                <el-tag v-for="a in n.aliases" :key="a" size="small" type="info" class="label-tag">{{ a }}</el-tag>
                <span v-if="!n.aliases || !n.aliases.length">-</span>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="cell-sub">默认网络</div>

          <el-divider content-position="left">变更网络</el-divider>
          <div v-loading="networksLoading">
            <el-select
              v-model="networkSelected"
              multiple
              filterable
              placeholder="选择网络"
              style="width: 240px; margin-right: 5px"
              size="small"
              :disabled="!canOperate || projectMode"
              :loading="networksLoading">
              <el-option v-for="net in availableNetworks" :key="net.id" :label="net.name" :value="net.name" />
            </el-select>
            <el-button v-if="canOperate && !projectMode" size="small" type="primary" :loading="networkLoading" @click="doChangeNetwork">确认</el-button>
            <el-button
              v-if="canOperate && !projectMode"
              :loading="creatingNetwork"
              size="small"
              type="text"
              icon="el-icon-plus"
              @click="createNetwork">创建网络</el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="部署设置" name="deploy">
          <div v-if="!deployConfigEditing" style="margin-bottom: 10px">
            <el-button v-if="canOperate" size="small" icon="el-icon-edit" @click="startEditDeployConfig">编辑</el-button>
          </div>
          <template v-if="deployConfigEditing">
            <el-divider content-position="left">更新配置</el-divider>
            <el-form inline size="small" :disabled="deployConfigSaving" class="deploy-form">
              <el-form-item label="并发数">
                <el-input-number v-model="editUpdateConfig.parallelism" :min="1" />
              </el-form-item>
              <el-form-item label="失败操作">
                <el-select v-model="editUpdateConfig.failure_action" style="width: 110px">
                  <el-option label="pause" value="pause" />
                  <el-option label="continue" value="continue" />
                  <el-option label="rollback" value="rollback" />
                </el-select>
              </el-form-item>
              <el-form-item label="延迟(秒)">
                <el-input-number v-model="editUpdateConfig.delay" :min="0" />
              </el-form-item>
              <el-form-item label="监控窗口(秒)">
                <el-input-number v-model="editUpdateConfig.monitor" :min="0" />
              </el-form-item>
              <el-form-item label="最大失败比例">
                <el-input-number v-model="editUpdateConfig.max_failure_ratio" :min="0" :max="1" :step="0.1" :precision="2" />
              </el-form-item>
              <el-form-item label="更新顺序">
                <el-select v-model="editUpdateConfig.order" style="width: 120px">
                  <el-option label="stop-first" value="stop-first" />
                  <el-option label="start-first" value="start-first" />
                </el-select>
              </el-form-item>
            </el-form>
            <el-divider content-position="left">回滚配置</el-divider>
            <el-form inline size="small" :disabled="deployConfigSaving" class="deploy-form">
              <el-form-item label="并发数">
                <el-input-number v-model="editRollbackConfig.parallelism" :min="1" />
              </el-form-item>
              <el-form-item label="失败操作">
                <el-select v-model="editRollbackConfig.failure_action" style="width: 110px">
                  <el-option label="pause" value="pause" />
                  <el-option label="continue" value="continue" />
                </el-select>
              </el-form-item>
              <el-form-item label="延迟(秒)">
                <el-input-number v-model="editRollbackConfig.delay" :min="0" />
              </el-form-item>
              <el-form-item label="监控窗口(秒)">
                <el-input-number v-model="editRollbackConfig.monitor" :min="0" />
              </el-form-item>
              <el-form-item label="最大失败比例">
                <el-input-number v-model="editRollbackConfig.max_failure_ratio" :min="0" :max="1" :step="0.1" :precision="2" />
              </el-form-item>
              <el-form-item label="更新顺序">
                <el-select v-model="editRollbackConfig.order" style="width: 120px">
                  <el-option label="stop-first" value="stop-first" />
                  <el-option label="start-first" value="start-first" />
                </el-select>
              </el-form-item>
            </el-form>
            <div style="margin-top: 12px">
              <el-button size="small" type="primary" :loading="deployConfigSaving" @click="saveDeployConfig">保存</el-button>
              <el-button size="small" @click="cancelEditDeployConfig">取消</el-button>
            </div>
          </template>
          <template v-else>
            <el-divider content-position="left">更新配置</el-divider>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="并发数">{{ service.update_config.parallelism }}</el-descriptions-item>
              <el-descriptions-item label="失败操作">{{ service.update_config.failure_action }}</el-descriptions-item>
              <el-descriptions-item label="延迟">{{ service.update_config.delay || '-' }}</el-descriptions-item>
              <el-descriptions-item label="监控窗口">{{ service.update_config.monitor || '-' }}</el-descriptions-item>
              <el-descriptions-item label="最大失败比例">{{ service.update_config.max_failure_ratio }}</el-descriptions-item>
              <el-descriptions-item label="更新顺序">{{ service.update_config.order }}</el-descriptions-item>
            </el-descriptions>
            <el-divider content-position="left">回滚配置</el-divider>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="并发数">{{ service.rollback_config.parallelism }}</el-descriptions-item>
              <el-descriptions-item label="失败操作">{{ service.rollback_config.failure_action }}</el-descriptions-item>
              <el-descriptions-item label="延迟">{{ service.rollback_config.delay || '-' }}</el-descriptions-item>
              <el-descriptions-item label="监控窗口">{{ service.rollback_config.monitor || '-' }}</el-descriptions-item>
              <el-descriptions-item label="最大失败比例">{{ service.rollback_config.max_failure_ratio }}</el-descriptions-item>
              <el-descriptions-item label="更新顺序">{{ service.rollback_config.order }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-tab-pane>

        <el-tab-pane v-if="service.placement && (service.placement.constraints.length || service.placement.preferences.length)" label="调度约束" name="placement">
          <template v-if="service.placement.constraints.length">
            <el-divider content-position="left">约束条件</el-divider>
            <el-tag v-for="c in service.placement.constraints" :key="c" size="small" type="warning" class="label-tag">{{ c }}</el-tag>
          </template>
          <template v-if="service.placement.preferences && service.placement.preferences.length">
            <el-divider content-position="left">偏好设置</el-divider>
            <div v-for="p in service.placement.preferences" :key="p.Spread.SpreadDescriptor" class="code-block">
              <code>{{ p.Spread.SpreadDescriptor }}</code>
            </div>
          </template>
        </el-tab-pane>

        <el-tab-pane v-if="service.health_check" label="健康检查" name="health">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="检测命令" :span="2">
              <code class="mono">{{ service.health_check.test.join(' ') }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="间隔">{{ service.health_check.interval || '-' }}</el-descriptions-item>
            <el-descriptions-item label="超时">{{ service.health_check.timeout || '-' }}</el-descriptions-item>
            <el-descriptions-item label="重试次数">{{ service.health_check.retries }}</el-descriptions-item>
            <el-descriptions-item label="启动等待">{{ service.health_check.start_period || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane v-if="service.labels && Object.keys(service.labels).length" label="标签" name="labels">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item v-for="(v, k) in service.labels" :key="k" :label="k">
              <code class="mono">{{ v }}</code>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="失败任务" name="failed-tasks">
          <div v-loading="tasksLoading">
            <el-table
              v-if="failedTasks.length"
              :data="failedTasks"
              border
              stripe
              size="small"
              max-height="420">
              <el-table-column label="槽位" width="60" align="center">
                <template #default="{ row: t }"><span class="mono">{{ t.slot }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90">
                <template #default="{ row: t }">
                  <el-tag size="small" :type="t.state === 'failed' ? 'danger' : t.state === 'rejected' ? 'warning' : 'info'">{{ t.state }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="节点" width="140" show-overflow-tooltip>
                <template #default="{ row: t }">
                  <span class="mono">{{ t.node_hostname || shortId(t.node_id, 8) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="消息" min-width="180" show-overflow-tooltip>
                <template #default="{ row: t }"><span>{{ t.message || '-' }}</span></template>
              </el-table-column>
              <el-table-column label="错误" min-width="220" show-overflow-tooltip>
                <template #default="{ row: t }">
                  <code v-if="t.error" class="mono task-error">{{ t.error }}</code>
                  <span v-else class="cell-sub">-</span>
                </template>
              </el-table-column>
              <el-table-column label="更新时间" width="170">
                <template #default="{ row: t }"><span class="cell-date">{{ formatDateTime(t.updated_at) }}</span></template>
              </el-table-column>
            </el-table>
            <div v-else class="cell-sub" style="text-align: center; padding: 20px">暂无失败任务</div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="容器列表" name="containers">
          <swarm-containers
            embedded
            :org-id="orgId"
            :cluster-id="clusterId"
            :cluster="cluster"
            :items="serviceContainers"
            :external-loading="containersLoading"
            :scope="requestScope"
            :can-operate="canOperate"
            :show-task-slot="true"
            empty-text="当前 Service 没有容器"
            @refresh="loadServiceContainers"
            @open-detail="goContainerDetail"
          />
        </el-tab-pane>
        <el-tab-pane v-if="!projectMode" label="事件" name="events">
          <div v-loading="eventsLoading">
            <div style="margin-bottom: 10px; display: flex; justify-content: flex-end">
              <el-button size="small" icon="el-icon-refresh" :loading="eventsLoading" @click="loadServiceEvents">刷新</el-button>
            </div>
            <el-table
              :data="serviceEvents"
              border
              stripe
              size="small"
              empty-text="暂无事件"
              max-height="480">
              <el-table-column label="时间" width="170">
                <template #default="{ row }"><span class="cell-date">{{ formatDateTime(row.time) }}</span></template>
              </el-table-column>
              <el-table-column label="类型" width="90">
                <template #default="{ row }"><el-tag size="small" type="info">{{ row.type }}</el-tag></template>
              </el-table-column>
              <el-table-column label="动作" width="100">
                <template #default="{ row }">
                  <el-tag size="small" :type="eventActionType(row.action)">{{ eventActionLabel(row.action) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="对象" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="mono">{{ row.actor_name || shortId(row.actor_id, 16) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="摘要" min-width="220" show-overflow-tooltip>
                <template #default="{ row }"><span class="cell-sub">{{ eventSummary(row) }}</span></template>
              </el-table-column>
              <el-table-column label="详情" width="70" align="center">
                <template #default="{ row }">
                  <el-popover v-if="hasEventAttributes(row)" placement="left" width="380" trigger="click">
                    <div class="event-attrs">
                      <div v-for="(v, k) in displayAttributes(row)" :key="k" class="event-attr-row">
                        <span class="event-attr-key">{{ k }}</span>
                        <span class="event-attr-val">{{ v }}</span>
                      </div>
                    </div>
                    <el-button slot="reference" type="text" size="small">详情</el-button>
                  </el-popover>
                  <span v-else class="cell-sub">-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="projectMode" label="运行告警" name="alerts" lazy>
          <runtime-alerts-events
            :org-id="orgId"
            :group-id="groupId"
            :project-id="projectId"
            :runtime-id="$route.params.runtimeId"
            section="alerts" />
        </el-tab-pane>
        <el-tab-pane v-if="projectMode" label="运行事件" name="runtime-events" lazy>
          <runtime-alerts-events
            :org-id="orgId"
            :group-id="groupId"
            :project-id="projectId"
            :runtime-id="$route.params.runtimeId"
            section="events" />
        </el-tab-pane>

        <el-tab-pane label="配置与密钥" name="configs-secrets">
          <div v-loading="configsSecretsLoading">
            <el-row :gutter="20">
              <!-- Configs -->
              <el-col :xs="24" :lg="12">
                <div class="cs-section">
                  <div class="cs-section-head">
                    <span class="cs-section-title"><i class="el-icon-document cs-section-icon"></i> Configs</span>
                    <el-button v-if="canOperate && !projectMode" size="small" type="primary" icon="el-icon-plus" @click="openConfigAdd">新增 Config</el-button>
                  </div>
                  <el-table
                    :data="serviceConfigs"
                    border
                    stripe
                    size="small"
                    empty-text="未挂载 Config"
                    max-height="360">
                    <el-table-column label="名称" min-width="140" show-overflow-tooltip>
                      <template #default="{ row }"><span class="mono">{{ row.name }}</span></template>
                    </el-table-column>
                    <el-table-column label="目标路径" min-width="200" show-overflow-tooltip>
                      <template #default="{ row }"><span class="mono cell-sub">{{ row.target }}</span></template>
                    </el-table-column>
                    <el-table-column v-if="canOperate && !projectMode" label="操作" width="80" align="center">
                      <template #default="{ row }">
                        <el-popconfirm title="确定移除该 Config 映射？" @confirm="removeConfig(row)">
                          <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">移除</el-button>
                        </el-popconfirm>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>

              <!-- Secrets -->
              <el-col :xs="24" :lg="12">
                <div class="cs-section">
                  <div class="cs-section-head">
                    <span class="cs-section-title"><i class="el-icon-key cs-section-icon"></i> Secrets</span>
                    <el-button v-if="canOperate && !projectMode" size="small" type="primary" icon="el-icon-plus" @click="openSecretAdd">新增 Secret</el-button>
                  </div>
                  <el-table
                    :data="serviceSecrets"
                    border
                    stripe
                    size="small"
                    empty-text="未挂载 Secret"
                    max-height="360">
                    <el-table-column label="名称" min-width="140" show-overflow-tooltip>
                      <template #default="{ row }"><span class="mono">{{ row.name }}</span></template>
                    </el-table-column>
                    <el-table-column label="目标路径" min-width="200" show-overflow-tooltip>
                      <template #default="{ row }"><span class="mono cell-sub">{{ row.target }}</span></template>
                    </el-table-column>
                    <el-table-column v-if="canOperate && !projectMode" label="操作" width="80" align="center">
                      <template #default="{ row }">
                        <el-popconfirm title="确定移除该 Secret 映射？" @confirm="removeSecret(row)">
                          <el-button slot="reference" type="text" size="small" icon="el-icon-delete" class="text-danger">移除</el-button>
                        </el-popconfirm>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新增 Config 对话框 -->
    <el-dialog title="新增 Config 映射" :visible.sync="configDialogVisible" width="560px" :close-on-click-modal="false">
      <el-form label-width="96px" size="small">
        <el-form-item label="来源">
          <el-radio-group v-model="configSource">
            <el-radio label="create">新建 Config</el-radio>
            <el-radio label="existing">选择已有</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="configSource === 'create'">
          <el-form-item label="名称">
            <el-input v-model="configForm.name" placeholder="如 nginx.conf" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="configForm.content" type="textarea" :rows="6" placeholder="Config 文件内容" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="选择 Config">
            <el-select v-model="configForm.config_id" placeholder="选择已有 Config" filterable style="width: 100%">
              <el-option v-for="c in availableConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item label="目标目录">
          <el-input v-model="configForm.target_dir" placeholder="/" />
          <div class="form-hint">最终挂载路径 = 目录 + "/" + 名称，例如 /etc/nginx + nginx.conf → /etc/nginx/nginx.conf</div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="configDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="configSaving" @click="submitConfigAdd">确定</el-button>
      </div>
    </el-dialog>

    <!-- 新增 Secret 对话框 -->
    <el-dialog title="新增 Secret 映射" :visible.sync="secretDialogVisible" width="560px" :close-on-click-modal="false">
      <el-form label-width="96px" size="small">
        <el-form-item label="来源">
          <el-radio-group v-model="secretSource">
            <el-radio label="create">新建 Secret</el-radio>
            <el-radio label="existing">选择已有</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="secretSource === 'create'">
          <el-form-item label="名称">
            <el-input v-model="secretForm.name" placeholder="如 db_password" @input="onSecretNameInput" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="secretForm.content" type="textarea" :rows="4" placeholder="Secret 内容" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="选择 Secret">
            <el-select v-model="secretForm.secret_id" placeholder="选择已有 Secret" filterable style="width: 100%" @change="onSecretExistingChange">
              <el-option v-for="s in availableSecrets" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item label="目标路径">
          <el-input v-model="secretForm.target" placeholder="/run/secrets/" @input="secretTargetTouched = true" />
          <div class="form-hint">建议映射到 /run/secrets/ 目录下，例如 /run/secrets/db_password</div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="secretDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="secretSaving" @click="submitSecretAdd">确定</el-button>
      </div>
    </el-dialog>

    <workload-image-dialog
      :visible.sync="imageEditing"
      title="设置 Service 镜像"
      :images="serviceImageEntries"
      :org-id="orgId"
      :cluster-id="clusterId"
      :saving="imageSaving"
      notice="保存前将先在 Manager 节点拉取镜像；拉取或认证失败时不会修改 Service。"
      @submit="saveImage" />

    <swarm-log-viewer ref="logViewer" :org-id="orgId" :cluster-id="clusterId" :scope="requestScope" />
  </div>
</template>

<script>
import {
  clusterSwarmServiceInspect,
  clusterSwarmServiceScale,
  clusterSwarmServiceForceUpdate,
  clusterSwarmServiceRollback,
  clusterSwarmServiceRemove,
  clusterSwarmServiceChangeNetwork,
  clusterSwarmServiceUpdateResources,
  clusterSwarmServiceUpdateEnv,
  clusterSwarmServiceUpdatePorts,
  clusterSwarmServiceUpdateConfig,
  clusterSwarmServiceUpdateMounts,
  clusterSwarmServiceTasks,
  clusterSwarmServiceContainers,
  clusterSwarmServiceEvents,
  clusterSwarmServiceConfigsSecrets,
  clusterSwarmServiceConfigAdd,
  clusterSwarmServiceSecretAdd,
  clusterSwarmServiceConfigRemove,
  clusterSwarmServiceSecretRemove,
  clusterSwarmServiceUpdateImage,
  clusterSwarmConfigs,
  clusterSwarmSecrets,
  clusterSwarmServicePrune,
  clusterSwarmNetworks,
  clusterSwarmNetworkCreate,
  clusterSwarmVolumes,
  clusterSwarmVolumeCreate
} from '@/api/cluster'
import ClusterBreadcrumb from '@/views/cluster/components/Breadcrumb.vue'
import ProjectBreadcrumb from '@/views/project/components/Breadcrumb.vue'
import SwarmLogViewer from '../LogViewer.vue'
import SwarmContainers from '../Containers.vue'
import WorkloadImageDialog from '@/views/components/WorkloadImageDialog.vue'
import { projectServiceDestroy } from '@/api/project'
import RuntimeAlertsEvents from '@/views/project/deploy/components/RuntimeAlertsEvents.vue'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor.vue'
import { routeBreadcrumb, shortId as _shortId, formatDateTime as _formatDateTime } from '@/utils/helpers'

export default {
  name: 'ServiceDetailBase',
  components: {
    ClusterBreadcrumb,
    ProjectBreadcrumb,
    SwarmLogViewer,
    SwarmContainers,
    WorkloadImageDialog,
    RuntimeAlertsEvents,
    ResourceConfigEditor
  },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) },
    project: { type: Object, default: null },
    groupId: { type: [Number, String], default: null },
    projectId: { type: [Number, String], default: null },
    mode: { type: String, default: 'swarm', validator: value => ['swarm', 'project'].includes(value) },
    canOperate: { type: Boolean, default: true },
    canDestroy: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      service: null,
      activeTab: 'info',
      showScale: false,
      scaleReplicas: 1,
      scaleLoading: false,
      networkSelected: [],
      networkLoading: false,
      networksLoading: false,
      availableNetworks: [],
      creatingNetwork: false,
      resourceLoading: false,
      imageEditing: false,
      imageSaving: false,
      resourceCpuLimit: 0,
      resourceCpuReserved: 0,
      resourceMemoryLimit: 0,
      resourceMemoryReserved: 0,
      tasksLoading: false,
      failedTasks: [],
      envEditing: false,
      envText: '',
      envSaving: false,
      editingPorts: [],
      portsSaving: false,
      deployConfigEditing: false,
      deployConfigSaving: false,
      editUpdateConfig: {},
      editRollbackConfig: {},
      containersLoading: false,
      containerCleanupLoading: false,
      serviceContainers: [],
      eventsLoading: false,
      serviceEvents: [],
      configsSecretsLoading: false,
      serviceConfigs: [],
      serviceSecrets: [],
      configDialogVisible: false,
      configSaving: false,
      configSource: 'create',
      configForm: { name: '', content: '', config_id: '', target_dir: '/' },
      availableConfigs: [],
      secretDialogVisible: false,
      secretSaving: false,
      secretSource: 'create',
      secretForm: { name: '', content: '', secret_id: '', target: '/run/secrets/' },
      secretTargetTouched: false,
      availableSecrets: [],
      mountsEditing: false,
      mountsSaving: false,
      editingMounts: [],
      availableVolumes: [],
      volumesLoading: false,
      creatingVolume: false
    }
  },
  computed: {
    serviceImageEntries () {
      return this.service
        ? [{ key: 'service', image: this.service.image || '' }]
        : []
    },
    serviceResources: {
      get () {
        return {
          cpu_limit: this.resourceCpuLimit,
          memory_limit: this.resourceMemoryLimit,
          cpu_reservation: this.resourceCpuReserved,
          memory_reservation: this.resourceMemoryReserved
        }
      },
      set (resources) {
        this.resourceCpuLimit = resources.cpu_limit
        this.resourceMemoryLimit = resources.memory_limit
        this.resourceCpuReserved = resources.cpu_reservation
        this.resourceMemoryReserved = resources.memory_reservation
      }
    },
    projectMode () {
      return this.mode === 'project'
    },
    requestScope () {
      return this.projectMode ? { groupId: this.groupId, projectId: this.projectId } : {}
    },
    breadcrumbComponent () {
      return this.projectMode ? 'ProjectBreadcrumb' : 'ClusterBreadcrumb'
    },
    breadcrumbSubject () {
      return this.projectMode ? { project: this.project || {} } : { cluster: this.cluster || {} }
    },
    serviceName () {
      return this.service ? this.service.name : (this.$route.query.name || 'Service 详情')
    },
    serviceId () {
      return this.$route.params.serviceId
    },
    breadcrumb () {
      if (this.projectMode) {
        return [
          ...routeBreadcrumb(this),
          { title: '实例', to: { name: 'ProjectInstance', params: { groupId: this.groupId, projectId: this.projectId } } },
          { title: this.serviceName, to: '' }
        ]
      }
      return [
        ...routeBreadcrumb(this),
        { title: 'Services', to: { name: 'ClusterSwarmServices', params: { clusterId: this.clusterId } } },
        { title: this.serviceName, to: '' }
      ]
    },
    serviceEnvRows () {
      if (!this.service || !this.service.env) return []
      return this.service.env.map(e => {
        const idx = e.indexOf('=')
        return idx >= 0 ? { key: e.slice(0, idx), val: e.slice(idx + 1) } : { key: e, val: '' }
      })
    },
    currentReplicas () {
      return this.service ? (this.service.replicas ?? this.service.desired_tasks ?? 0) : 0
    },
    scaleMax () {
      return Math.max(this.currentReplicas * 8, 1)
    },
    scaleMarks () {
      const current = this.currentReplicas
      const marks = { 0: '0' }
      marks[current] = String(current)
      marks[this.scaleMax] = String(this.scaleMax)
      return marks
    },
    rollbackAlert () {
      if (!this.service || !this.service.update_status) return null
      const state = this.service.update_status.state || ''
      const message = this.service.update_status.message || ''
      const completedAt = this.service.update_status.completed_at || ''
      if (state === 'rollback_completed') {
        return {
          title: 'Service 已自动回滚',
          type: 'warning',
          description: `回滚已完成${completedAt ? '（' + this.formatDateTime(completedAt) + '）' : ''}。${message ? ' 详情：' + message : ''} 上一个版本的配置已恢复，请检查并修正导致失败的配置后重试。`
        }
      }
      if (state === 'rollback_started') {
        return {
          title: 'Service 正在回滚中',
          type: 'warning',
          description: `正在回滚到上一个版本${message ? '：' + message : ''}，请等待回滚完成。`
        }
      }
      if (state === 'rollback_paused') {
        return {
          title: 'Service 回滚已暂停',
          type: 'danger',
          description: `回滚操作已暂停${message ? '：' + message : ''}，需要人工介入处理。`
        }
      }
      if (state === 'rollback_failed') {
        return {
          title: 'Service 回滚失败',
          type: 'danger',
          description: `回滚操作执行失败${message ? '：' + message : ''}，请检查 Service 状态并手动处理。`
        }
      }
      return null
    },
    updateStatusTagType () {
      const state = this.service?.update_status?.state || ''
      if (state === 'completed' || state === 'rollback_completed') return 'success'
      if (state === 'updating' || state === 'rollback_started') return 'primary'
      if (state.startsWith('rollback_') || state === 'paused') return 'warning'
      return 'info'
    },
    updateStatusLabel () {
      const state = this.service?.update_status?.state || ''
      const labels = {
        updating: '更新中',
        completed: '更新完成',
        paused: '已暂停',
        rollback_started: '回滚中',
        rollback_completed: '已回滚',
        rollback_paused: '回滚暂停',
        rollback_failed: '回滚失败'
      }
      return labels[state] || state
    },
    containerRunningCount () {
      return this.serviceContainers.filter(c => c.state === 'running').length
    },
    containerStoppedCount () {
      return this.serviceContainers.filter(c => c.state !== 'running').length
    }
  },
  watch: {
    activeTab (val) {
      if (val === 'failed-tasks' && !this.failedTasks.length) {
        this.loadFailedTasks()
      }
      if (val === 'networks') {
        this.initPorts()
        if (this.canOperate && !this.projectMode) {
          this.loadNetworks()
        }
      }
      if (val === 'containers' && !this.serviceContainers.length) {
        this.loadServiceContainers()
      }
      if (val === 'events' && !this.serviceEvents.length) {
        this.loadServiceEvents()
      }
      if (val === 'configs-secrets' && !this.serviceConfigs.length && !this.serviceSecrets.length) {
        this.loadConfigsSecrets()
      }
    }
  },
  created () {
    this.loadServiceDetail()
    const tab = this.$route.query.tab
    const knownTabs = ['failed-tasks', 'containers', 'events', 'alerts', 'runtime-events', 'configs-secrets']
    if (tab && knownTabs.includes(tab)) {
      this.activeTab = tab
    }
  },
  methods: {
    loadServiceDetail () {
      this.loading = true
      clusterSwarmServiceInspect(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(res => {
        this.service = res.data || res
        this.initResourceForm()
        this.initPorts()
      }).catch(() => {
        this.$message.error('无法加载 Service 详情，可能已被删除')
        this.goBack()
      }).finally(() => {
        this.loading = false
      })
    },
    reloadAndCheckRollback () {
      return clusterSwarmServiceInspect(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(res => {
        this.service = res.data || res
        this.initResourceForm()
        const state = this.service.update_status?.state || ''
        if (state.startsWith('rollback_')) {
          const alert = this.rollbackAlert
          if (alert) {
            this.$message({
              type: alert.type === 'danger' ? 'error' : 'warning',
              message: alert.title,
              duration: 8000,
              showClose: true
            })
          }
        }
      })
    },
    startBulkEdit () {
      if (this.service && this.service.env) {
        this.envText = this.service.env.join('\n')
      } else {
        this.envText = ''
      }
      this.envEditing = true
    },
    cancelEnvEdit () {
      this.envEditing = false
      this.envText = ''
    },
    saveEnv () {
      const env = this.envText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '' && line.includes('='))
      this.envSaving = true
      clusterSwarmServiceUpdateEnv(this.orgId, this.clusterId, this.serviceId, env, this.requestScope).then(() => {
        this.$message.success('环境变量已更新')
        this.envEditing = false
        this.envText = ''
        this.reloadAndCheckRollback()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '保存失败'))
      }).finally(() => { this.envSaving = false })
    },
    startEditImage () {
      this.imageEditing = true
    },
    saveImage (images) {
      const selected = images[0] || {}
      this.imageSaving = true
      clusterSwarmServiceUpdateImage(
        this.orgId,
        this.clusterId,
        this.serviceId,
        selected.image,
        selected.registryId,
        this.requestScope
      ).then(() => {
        this.$message.success('镜像已更新，Service 正在滚动更新')
        this.imageEditing = false
        this.reloadAndCheckRollback()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '更新失败'))
      }).finally(() => {
        this.imageSaving = false
      })
    },
    initPorts () {
      if (this.service && this.service.ports) {
        this.editingPorts = this.service.ports.map(p => ({ ...p }))
      } else {
        this.editingPorts = []
      }
    },
    addPort () {
      const used = new Set(this.editingPorts.map(port => Number(port.published_port || 0)).filter(Boolean))
      let published = Number(this.service?.suggested_published_port || 0)
      if (published < 1024 || published > 9999 || used.has(published)) {
        for (let attempt = 0; attempt < 200; attempt++) {
          const candidate = 1024 + Math.floor(Math.random() * 8976)
          if (!used.has(candidate)) { published = candidate; break }
        }
      }
      this.editingPorts.push({ protocol: 'tcp', target_port: 80, published_port: published, publish_mode: 'ingress' })
    },
    removePort (index) {
      this.editingPorts.splice(index, 1)
    },
    resetPorts () {
      this.initPorts()
    },
    savePorts () {
      this.portsSaving = true
      clusterSwarmServiceUpdatePorts(this.orgId, this.clusterId, this.serviceId, this.editingPorts, this.requestScope).then(() => {
        this.$message.success('端口已更新')
        this.reloadAndCheckRollback()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '保存失败'))
      }).finally(() => { this.portsSaving = false })
    },
    startEditDeployConfig () {
      const uc = this.service.update_config || {}
      const rc = this.service.rollback_config || {}
      const nsToSec = (ns) => {
        const n = Number(ns)
        return n > 0 ? Math.round(n / 1_000_000_000) : 0
      }
      this.editUpdateConfig = {
        parallelism: uc.parallelism ?? 1,
        failure_action: uc.failure_action || 'pause',
        delay: nsToSec(uc.delay),
        monitor: nsToSec(uc.monitor),
        max_failure_ratio: uc.max_failure_ratio ?? 0,
        order: uc.order || 'stop-first'
      }
      this.editRollbackConfig = {
        parallelism: rc.parallelism ?? 1,
        failure_action: rc.failure_action || 'pause',
        delay: nsToSec(rc.delay),
        monitor: nsToSec(rc.monitor),
        max_failure_ratio: rc.max_failure_ratio ?? 0,
        order: rc.order || 'stop-first'
      }
      this.deployConfigEditing = true
    },
    cancelEditDeployConfig () {
      this.deployConfigEditing = false
    },
    saveDeployConfig () {
      this.deployConfigSaving = true
      clusterSwarmServiceUpdateConfig(
        this.orgId, this.clusterId, this.serviceId,
        this.editUpdateConfig,
        this.editRollbackConfig,
        this.requestScope
      ).then(() => {
        this.$message.success('部署配置已更新')
        this.deployConfigEditing = false
        this.reloadAndCheckRollback()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '保存失败'))
      }).finally(() => { this.deployConfigSaving = false })
    },
    startEditMounts () {
      this.editingMounts = (this.service.mounts || []).map(m => ({ ...m }))
      this.mountsEditing = true
      this.loadVolumes()
    },
    cancelEditMounts () {
      this.mountsEditing = false
      this.editingMounts = []
    },
    addMount () {
      this.editingMounts.push({ type: 'bind', source: '', target: '', readonly: false })
    },
    removeMount (index) {
      this.editingMounts.splice(index, 1)
    },
    saveMounts () {
      this.mountsSaving = true
      clusterSwarmServiceUpdateMounts(
        this.orgId, this.clusterId, this.serviceId, this.editingMounts
      ).then(() => {
        this.$message.success('挂载已更新')
        this.mountsEditing = false
        this.reloadAndCheckRollback()
      }).catch(err => {
        this.$message.error(typeof err === 'string' ? err : (err.response?.data?.msg || err.message || '保存失败'))
      }).finally(() => { this.mountsSaving = false })
    },
    loadVolumes () {
      if (this.availableVolumes.length) return
      this.volumesLoading = true
      clusterSwarmVolumes(this.orgId, this.clusterId).then(res => {
        this.availableVolumes = res.data.volumes || []
      }).finally(() => { this.volumesLoading = false })
    },
    doCreateVolume (rowIndex) {
      const mount = this.editingMounts[rowIndex]
      this.$prompt('请输入新卷名称', '创建数据卷', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/,
        inputErrorMessage: '字母或数字开头，可包含 _ . -，最长 64 字符'
      }).then(({ value }) => {
        const name = value.trim()
        this.creatingVolume = true
        return clusterSwarmVolumeCreate(this.orgId, this.clusterId, name)
      }).then(res => {
        const vol = res.data.volume
        this.availableVolumes.push(vol)
        mount.source = vol.name
        this.$message.success('数据卷 ' + vol.name + ' 创建成功')
      }).catch(err => {
        if (err !== 'cancel' && err !== 'close') {
          this.$message.error(err.response?.data?.msg || err.message || '创建失败')
        }
      }).finally(() => { this.creatingVolume = false })
    },
    goBack () {
      if (this.projectMode) {
        this.$router.push({ name: 'ProjectInstance', params: { groupId: this.groupId, projectId: this.projectId } })
        return
      }
      this.$router.push({ name: 'ClusterSwarmServices', params: { clusterId: this.clusterId } })
    },
    closeSections () {
      this.showScale = false
    },
    toggleScale () {
      this.closeSections()
      this.showScale = !this.showScale
      if (this.showScale) {
        this.scaleReplicas = this.currentReplicas
      }
    },
    doScale () {
      this.scaleLoading = true
      clusterSwarmServiceScale(this.orgId, this.clusterId, this.serviceId, this.scaleReplicas, this.requestScope).then(() => {
        this.$message.success(`副本数已调整为 ${this.scaleReplicas}`)
        this.showScale = false
        this.reloadAndCheckRollback()
      }).finally(() => { this.scaleLoading = false })
    },
    loadNetworks () {
      if (this.availableNetworks.length) return
      this.networksLoading = true
      clusterSwarmNetworks(this.orgId, this.clusterId).then(res => {
        this.availableNetworks = (res.data.networks || []).filter(
          n => n.driver === 'overlay' && !n.ingress
        )
        const currentTargets = this.service.networks || []
        if (currentTargets.length) {
          this.networkSelected = currentTargets
            .map(target => {
              const identity = typeof target === 'string'
                ? target
                : (target.name || target.target || '')
              const match = this.availableNetworks.find(
                n => n.id === identity || n.name === identity
              )
              return match ? match.name : null
            })
            .filter(Boolean)
        }
      }).finally(() => { this.networksLoading = false })
    },
    doChangeNetwork () {
      this.networkLoading = true
      clusterSwarmServiceChangeNetwork(
        this.orgId, this.clusterId, this.serviceId, this.networkSelected
      ).then(() => {
        this.$message.success('网络已更新')
        this.reloadAndCheckRollback()
      }).finally(() => { this.networkLoading = false })
    },
    createNetwork () {
      this.$prompt('请输入新的 Overlay 网络名称', '创建网络', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/,
        inputErrorMessage: '字母/数字开头，可包含 _ . -，最长 63 字符'
      }).then(({ value }) => {
        this.creatingNetwork = true
        return clusterSwarmNetworkCreate(this.orgId, this.clusterId, value.trim())
      }).then(res => {
        const net = res.data.network
        clusterSwarmNetworks(this.orgId, this.clusterId).then(res => {
          this.availableNetworks = (res.data.networks || []).filter(
            n => n.driver === 'overlay' && !n.ingress
          )
          this.$nextTick(() => {
            if (!this.networkSelected.includes(net.name)) {
              this.networkSelected.push(net.name)
            }
          })
        })
        this.$message.success('网络 ' + net.name + ' 创建成功')
      }).catch(err => {
        if (err !== 'cancel' && err !== 'close') {
          this.$message.error(err.response?.data?.message || err.message || '创建失败')
        }
      }).finally(() => {
        this.creatingNetwork = false
      })
    },
    initResourceForm () {
      if (!this.service) return
      this.resourceCpuLimit = this.service.cpu_limit || 0
      this.resourceCpuReserved = this.service.cpu_reserved || 0
      this.resourceMemoryLimit = this.service.memory_limit ? this.service.memory_limit / (1024 * 1024) : 0
      this.resourceMemoryReserved = this.service.memory_reserved ? this.service.memory_reserved / (1024 * 1024) : 0
    },
    doUpdateResources () {
      this.resourceLoading = true
      clusterSwarmServiceUpdateResources(
        this.orgId, this.clusterId, this.serviceId, {
          cpu_limit: this.resourceCpuLimit,
          cpu_reserved: this.resourceCpuReserved,
          memory_limit: this.resourceMemoryLimit * 1024 * 1024,
          memory_reserved: this.resourceMemoryReserved * 1024 * 1024
        },
        this.requestScope
      ).then(() => {
        this.$message.success('资源配置已更新')
        this.reloadAndCheckRollback()
      }).finally(() => { this.resourceLoading = false })
    },
    doForceUpdate () {
      if (!this.service) return
      const action = this.projectMode ? '滚动重启' : '强制更新'
      this.$confirm(`确定对 Service「${this.service.name}」执行${action}？将触发所有任务的滚动重启。`, `${action}确认`, {
        type: 'warning',
        confirmButtonText: '确认更新',
        cancelButtonText: '取消'
      }).then(() => {
        return clusterSwarmServiceForceUpdate(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(() => {
          this.$message.success(`正在${action}`)
          this.reloadAndCheckRollback()
        })
      }).catch(() => {})
    },
    doRollback () {
      if (!this.service) return
      this.$confirm(`确定回滚 Service「${this.service.name}」到上一个版本？`, '回滚确认', {
        type: 'warning',
        confirmButtonText: '确认回滚',
        cancelButtonText: '取消'
      }).then(() => {
        return clusterSwarmServiceRollback(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(() => {
          this.$message.success('已回滚到上一个版本')
          this.reloadAndCheckRollback()
        })
      }).catch(() => {})
    },
    doRemove () {
      if (!this.service) return
      const action = this.projectMode ? '销毁' : '删除'
      this.$confirm(`确定${action} Service「${this.service.name}」？操作后无法恢复。`, `${action}确认`, {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }).then(() => {
        const request = this.projectMode
          ? projectServiceDestroy(this.orgId, this.groupId, this.projectId, this.serviceId)
          : clusterSwarmServiceRemove(this.orgId, this.clusterId, this.serviceId, this.requestScope)
        return request.then(() => {
          this.$message.success(`Service ${this.service.name} 已${action}`)
          this.goBack()
        })
      }).catch(() => {})
    },
    openLogs () {
      if (this.service) {
        this.$refs.logViewer.openService(this.service)
      }
    },
    loadFailedTasks () {
      this.tasksLoading = true
      clusterSwarmServiceTasks(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(res => {
        const tasks = res.data.tasks || []
        this.failedTasks = tasks.filter(t => ['failed', 'rejected', 'orphaned'].includes(t.state))
      }).finally(() => {
        this.tasksLoading = false
      })
    },
    loadServiceContainers () {
      this.containersLoading = true
      clusterSwarmServiceContainers(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(res => {
        this.serviceContainers = res.data.containers || []
      }).finally(() => {
        this.containersLoading = false
      })
    },
    loadServiceEvents () {
      this.eventsLoading = true
      clusterSwarmServiceEvents(this.orgId, this.clusterId, this.serviceId, {}, this.requestScope).then(res => {
        this.serviceEvents = res.data.events || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载事件失败')
      }).finally(() => {
        this.eventsLoading = false
      })
    },
    eventActionLabel (action) {
      const labels = {
        create: '创建',
        update: '更新',
        rollback: '回滚',
        remove: '删除',
        start: '启动',
        die: '退出',
        kill: '终止',
        pause: '暂停',
        unpause: '恢复',
        restart: '重启',
        scale: '伸缩',
        attach: '附加',
        detach: '分离',
        exec_create: '执行命令',
        exec_start: '执行',
        exec_die: '命令结束',
        health_status: '健康检查',
        oom: 'OOM',
        top: '进程',
        resize: '调整',
        export: '导出',
        import: '导入',
        connect: '接入网络',
        disconnect: '退出网络'
      }
      return labels[action] || action
    },
    eventActionType (action) {
      if (['create', 'update', 'scale', 'start', 'unpause', 'restart', 'connect'].includes(action)) return 'primary'
      if (['rollback', 'pause', 'health_status'].includes(action)) return 'warning'
      if (['remove', 'die', 'kill', 'oom', 'disconnect'].includes(action)) return 'danger'
      return 'info'
    },
    displayAttributes (row) {
      const attrs = row.attributes || {}
      const hidden = ['service', 'name', 'id']
      const filtered = {}
      Object.keys(attrs).forEach(k => {
        if (!hidden.includes(k)) filtered[k] = attrs[k]
      })
      return filtered
    },
    hasEventAttributes (row) {
      return Object.keys(this.displayAttributes(row)).length > 0
    },
    eventSummary (row) {
      const attrs = this.displayAttributes(row)
      const keys = Object.keys(attrs)
      if (!keys.length) return '无附加信息'
      return keys.map(k => `${k}=${attrs[k]}`).join(' · ')
    },
    loadConfigsSecrets () {
      this.configsSecretsLoading = true
      clusterSwarmServiceConfigsSecrets(this.orgId, this.clusterId, this.serviceId, this.requestScope).then(res => {
        this.serviceConfigs = res.data.configs || []
        this.serviceSecrets = res.data.secrets || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载配置与密钥失败')
      }).finally(() => {
        this.configsSecretsLoading = false
      })
    },
    openConfigAdd () {
      this.configSource = 'create'
      this.configForm = { name: '', content: '', config_id: '', target_dir: '/' }
      clusterSwarmConfigs(this.orgId, this.clusterId).then(res => {
        this.availableConfigs = res.data.configs || []
      }).catch(() => { this.availableConfigs = [] })
      this.configDialogVisible = true
    },
    submitConfigAdd () {
      if (this.configSource === 'create') {
        if (!this.configForm.name.trim()) return this.$message.warning('请输入 Config 名称')
        if (!this.configForm.content) return this.$message.warning('请输入 Config 内容')
      } else {
        if (!this.configForm.config_id) return this.$message.warning('请选择已有 Config')
      }
      const data = this.configSource === 'create'
        ? { name: this.configForm.name.trim(), content: this.configForm.content, target_dir: this.configForm.target_dir || '/' }
        : { config_id: this.configForm.config_id, target_dir: this.configForm.target_dir || '/' }
      this.configSaving = true
      clusterSwarmServiceConfigAdd(this.orgId, this.clusterId, this.serviceId, data).then(() => {
        this.$message.success('Config 映射已添加')
        this.configDialogVisible = false
        this.loadConfigsSecrets()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '添加失败')
      }).finally(() => { this.configSaving = false })
    },
    removeConfig (row) {
      clusterSwarmServiceConfigRemove(this.orgId, this.clusterId, this.serviceId, row.id).then(() => {
        this.$message.success('Config 映射已移除')
        this.loadConfigsSecrets()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '移除失败')
      })
    },
    openSecretAdd () {
      this.secretSource = 'create'
      this.secretForm = { name: '', content: '', secret_id: '', target: '/run/secrets/' }
      this.secretTargetTouched = false
      clusterSwarmSecrets(this.orgId, this.clusterId).then(res => {
        this.availableSecrets = res.data.secrets || []
      }).catch(() => { this.availableSecrets = [] })
      this.secretDialogVisible = true
    },
    onSecretNameInput () {
      if (!this.secretTargetTouched) {
        this.secretForm.target = '/run/secrets/' + (this.secretForm.name || '')
      }
    },
    onSecretExistingChange (id) {
      const s = this.availableSecrets.find(x => x.id === id)
      if (s) {
        this.secretForm.target = '/run/secrets/' + s.name
        this.secretTargetTouched = false
      }
    },
    submitSecretAdd () {
      if (this.secretSource === 'create') {
        if (!this.secretForm.name.trim()) return this.$message.warning('请输入 Secret 名称')
        if (!this.secretForm.content) return this.$message.warning('请输入 Secret 内容')
      } else {
        if (!this.secretForm.secret_id) return this.$message.warning('请选择已有 Secret')
      }
      const data = this.secretSource === 'create'
        ? { name: this.secretForm.name.trim(), content: this.secretForm.content, target: this.secretForm.target }
        : { secret_id: this.secretForm.secret_id, target: this.secretForm.target }
      this.secretSaving = true
      clusterSwarmServiceSecretAdd(this.orgId, this.clusterId, this.serviceId, data).then(() => {
        this.$message.success('Secret 映射已添加')
        this.secretDialogVisible = false
        this.loadConfigsSecrets()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '添加失败')
      }).finally(() => { this.secretSaving = false })
    },
    removeSecret (row) {
      clusterSwarmServiceSecretRemove(this.orgId, this.clusterId, this.serviceId, row.id).then(() => {
        this.$message.success('Secret 映射已移除')
        this.loadConfigsSecrets()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '移除失败')
      })
    },
    doCleanupStoppedContainers () {
      const stoppedContainers = this.serviceContainers.filter(c => c.state !== 'running')
      if (stoppedContainers.length === 0) {
        this.$message.info('没有需要清理的已停止容器')
        return
      }
      this.$confirm(
        `确定删除当前 Service 下全部 ${stoppedContainers.length} 个已停止容器吗？此操作不可恢复。`,
        '清理确认',
        { type: 'warning', confirmButtonText: '确认清理', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
      ).then(() => {
        this.containerCleanupLoading = true
        return clusterSwarmServicePrune(this.orgId, this.clusterId, [this.serviceId]).then(res => {
          const data = res.data || {}
          const pruned = data.pruned_count || 0
          const failed = (data.failed || []).length
          if (failed > 0) {
            this.$message.warning(`已清理 ${pruned} 个容器，${failed} 个操作失败`)
          } else {
            this.$message.success(`已清理 ${pruned} 个容器`)
          }
          this.loadServiceContainers()
        }).finally(() => {
          this.containerCleanupLoading = false
        })
      }).catch(() => {})
    },
    goContainerDetail (row) {
      const clusterId = this.containerClusterId(row)
      const query = { from: 'service', serviceId: this.serviceId, ...(row.node_id ? { node_id: row.node_id } : {}) }
      if (this.projectMode) {
        this.$router.push({
          name: 'ProjectSwarmContainerDetail',
          params: {
            groupId: this.groupId,
            projectId: this.projectId,
            runtimeId: this.$route.params.runtimeId,
            containerId: row.id
          },
          query: { ...query, cluster_id: clusterId }
        })
        return
      }
      this.$router.push({
        name: 'ClusterSwarmContainerDetail',
        params: { clusterId, containerId: row.id },
        query
      })
    },
    containerClusterId (row) {
      return Number(row.cluster_id || this.clusterId)
    },
    shortId (value, length = 12) {
      return _shortId(value, length)
    },
    formatDateTime (value) {
      return _formatDateTime(value)
    }
  }
}
</script>

<style lang="scss" scoped>
.rollback-alert {
  margin: 16px 20px 0;
  border-radius: 6px;
}
.resource-actions { margin-top: 14px; text-align: right; }
.header-card {
  margin: 20px 20px 0;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__body { padding: 16px 20px; }
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.service-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.service-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.service-meta {
  font-size: 13px;
  color: #909399;
}
.ops-bar {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.inline-section {
  margin-top: 12px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
}
.scale-slider {
  width: 100%;
  max-width: 520px;
}
.inline-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
.content-card {
  margin: 16px 20px 20px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  ::v-deep .el-card__body { padding: 0 20px 20px; }
}

.detail-tabs {
  ::v-deep .el-tabs__header { margin-bottom: 12px; }
  ::v-deep .el-tabs__item { font-size: 14px; font-weight: 500; }
}

.sub-table {
  margin-bottom: 4px;
  font-size: 14px;
}

.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }

.image-edit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.code-block {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #f5f7fa;
  border-radius: 4px;
  .code-label {
    display: inline-block;
    min-width: 80px;
    font-size: 12px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  code {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    color: #303133;
    word-break: break-all;
  }
}

.env-key { color: #409eff; font-size: 13px; }
.env-val { color: #606266; word-break: break-all; font-size: 13px; }

.label-tag { margin-right: 4px; margin-bottom: 4px; }

.cell-sub { color: #909399; font-size: 12px; }
.cell-date { color: #606266; font-size: 13px; }
.task-error { color: #e6a23c; word-break: break-all; }

.port-edit-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
  .port-label { font-size: 12px; color: #909399; width: 28px; text-align: right; }
}
.deploy-form {
  ::v-deep .el-form-item { margin-bottom: 8px; }
}

/* 容器列表 tab 样式 */
.stat-mini-grid {
  margin: 0 0 16px;
}
.stat-mini-card {
  background: #fff; border-radius: 6px; padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 3px solid #e4e7ed;
  cursor: pointer; transition: box-shadow .2s, transform .15s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10); }
  &.running { border-left-color: #67c23a; }
  &.stopped { border-left-color: #909399; }
  &.active { box-shadow: 0 2px 8px rgba(0,0,0,.15); transform: translateY(-1px); }
  .stat-mini-value { font-size: 26px; font-weight: 700; color: #303133; line-height: 1.2; }
  .stat-mini-label {
    margin-top: 6px; font-size: 13px; color: #909399;
    .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%; margin-right: 5px; vertical-align: middle;
    }
  }
  &.running .stat-mini-label .dot { background: #67c23a; }
  &.stopped .stat-mini-label .dot { background: #909399; }
  &.cleanup-card {
    cursor: default; border-left-color: #f56c6c;
    display: flex; align-items: center; justify-content: center;
    &:hover { box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  }
}

.status-cell {
  .status-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; margin-right: 5px; vertical-align: middle;
    &.success { background: #67c23a; }
    &.warning { background: #e6a23c; }
    &.info { background: #909399; }
    &.danger { background: #f56c6c; }
  }
}

.task-state-tag { margin-left: 6px; }
.task-error-text { color: #e6a23c; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cell-name { font-weight: 600; color: #303133; font-size: 13px; }
.cell-name-link { cursor: pointer; color: #409eff; &:hover { text-decoration: underline; } }
.cell-image { color: #606266; font-size: 13px; }
.cell-id { margin-top: 3px; color: #909399; font-size: 12px; }
.cell-metric { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 500; color: #303133; }

.port-tag { margin: 1px 3px 1px 0; }

.action-dropdown-btn {
  font-size: 13px; color: #409eff; padding: 0 4px;
}

.cs-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 14px 16px;
  .cs-section-head {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    .cs-section-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
    .cs-section-icon { margin-right: 6px; color: #409eff; }
    .el-button { margin-left: auto; }
  }
}

.form-hint {
  display: block;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.event-attrs {
  max-height: 320px;
  overflow: auto;
  .event-attr-row {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid #f0f2f5;
    font-size: 12px;
    &:last-child { border-bottom: none; }
    .event-attr-key {
      flex: 0 0 120px;
      color: #909399;
      word-break: break-all;
      font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    }
    .event-attr-val {
      flex: 1;
      color: #303133;
      word-break: break-all;
      font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    }
  }
}
</style>
