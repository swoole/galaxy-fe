<template>
  <div class="k8s-deployment-detail" v-loading="loading">
    <component
      :is="breadcrumbComponent"
      :breadcrumb="breadcrumb"
      v-bind="breadcrumbSubject" />

    <el-alert
      v-if="error"
      class="error-alert"
      type="error"
      :closable="false"
      show-icon
      :title="error" />

    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <div class="deployment-title">
          <h2 class="deployment-name">{{ deploymentName || 'Deployment' }}</h2>
          <el-tag size="small" type="info">Deployment</el-tag>
          <span v-if="loaded" class="deployment-meta">Namespace {{ meta('namespace') }}</span>
          <span v-if="loaded" class="deployment-meta">创建于 {{ formatK8sDate(meta('creationTimestamp')) }}</span>
        </div>
        <el-button size="small" icon="el-icon-back" @click="goBack">返回列表</el-button>
      </div>

      <div v-if="loaded" class="ops-bar">
        <template v-if="canOperate">
          <el-button
            size="small"
            icon="el-icon-sort"
            :loading="scaleSaving"
            @click="openScale">
            伸缩
          </el-button>
          <el-button
            size="small"
            icon="el-icon-refresh"
            :loading="restarting"
            @click="restart">
            重启
          </el-button>
          <el-popconfirm
            v-if="!projectMode || canDestroy"
            :title="projectMode ? '确定销毁该项目实例？' : '确定删除该 Deployment？'"
            @confirm="remove">
            <el-button
              slot="reference"
              size="small"
              icon="el-icon-delete"
              type="danger"
              plain>
              {{ projectMode ? '销毁 Deployment' : '删除' }}
            </el-button>
          </el-popconfirm>
        </template>
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>

      <div v-if="scaleVisible" class="inline-section">
        <span class="inline-label">副本数：{{ specVal('replicas') }} → {{ scaleReplicas }}</span>
        <el-slider
          v-model="scaleReplicas"
          :min="0"
          :max="scaleMax"
          :marks="scaleMarks"
          show-input
          class="scale-slider" />
        <div>
          <el-button size="small" type="primary" :loading="scaleSaving" @click="confirmScale">确认</el-button>
          <el-button size="small" @click="scaleVisible = false">取消</el-button>
        </div>
      </div>
    </el-card>

    <el-card v-if="loaded" shadow="never" class="content-card">
      <el-tabs v-model="activeTab" class="detail-tabs" @tab-click="onTabClick">
        <!-- 概览 -->
        <el-tab-pane label="基本信息" name="overview">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Deployment UID" :span="2">
              <span class="mono">{{ meta('uid') }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="名称">{{ meta('name') }}</el-descriptions-item>
            <el-descriptions-item label="命名空间">{{ meta('namespace') }}</el-descriptions-item>
            <el-descriptions-item label="镜像" :span="2">
              <div
                v-for="item in imageEdit"
                :key="item.name"
                class="deployment-image">
                <span v-if="imageEdit.length > 1" class="container-name">{{ item.name }}</span>
                <image-reference
                  :value="item.image"
                  :org-id="orgId"
                  :cluster-id="clusterId" />
              </div>
              <span v-if="!imageEdit.length" class="cell-sub">-</span>
              <el-button
                v-if="canOperate && imageEdit.length"
                type="text"
                size="small"
                icon="el-icon-edit"
                class="image-edit-button"
                @click="startEditImages">
                修改
              </el-button>
            </el-descriptions-item>
            <el-descriptions-item label="期望副本">{{ specVal('replicas') }}</el-descriptions-item>
            <el-descriptions-item label="就绪副本">
              <el-tag size="small" :type="replicaStatusType">
                {{ statusVal('readyReplicas') }} / {{ specVal('replicas') }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="可用副本">{{ statusVal('availableReplicas') }}</el-descriptions-item>
            <el-descriptions-item label="已更新副本">{{ statusVal('updatedReplicas') }}</el-descriptions-item>
            <el-descriptions-item label="更新策略">{{ updateStrategyText }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatK8sDate(meta('creationTimestamp')) }}</el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">标签与选择器</el-divider>
          <el-row :gutter="16">
            <el-col :xs="24" class="overview-section">
              <el-row :gutter="16">
                <el-col :xs="24" :lg="8">
                  <div class="readonly-panel">
                    <div class="readonly-panel-title">Deployment 标签</div>
                    <div v-if="Object.keys(deploymentLabelsObj).length" class="tag-wrap">
                      <el-tag
                        v-for="(value, key) in deploymentLabelsObj"
                        :key="key"
                        size="small"
                        type="info"
                        class="label-tag">
                        {{ key }}={{ value }}
                      </el-tag>
                    </div>
                    <span v-else class="cell-sub">无标签</span>
                  </div>
                </el-col>
                <el-col :xs="24" :lg="8">
                  <div class="readonly-panel">
                    <div class="readonly-panel-title">Pod 模板标签</div>
                    <div v-if="Object.keys(podTemplateLabelsObj).length" class="tag-wrap">
                      <el-tag
                        v-for="(value, key) in podTemplateLabelsObj"
                        :key="key"
                        size="small"
                        type="info"
                        class="label-tag">
                        {{ key }}={{ value }}
                      </el-tag>
                    </div>
                    <span v-else class="cell-sub">无标签</span>
                  </div>
                </el-col>
                <el-col :xs="24" :lg="8">
                  <div class="readonly-panel">
                    <div class="readonly-panel-title">选择器</div>
                    <div v-if="selectorLabels.length" class="tag-wrap">
                      <el-tag
                        v-for="(value, key) in selectorLabelsObj"
                        :key="key"
                        size="small"
                        type="info"
                        class="label-tag">
                        {{ key }}={{ value }}
                      </el-tag>
                    </div>
                    <span v-else class="cell-sub">无选择器</span>
                  </div>
                </el-col>
              </el-row>
            </el-col>
            <el-col :xs="24" class="overview-section">
              <el-divider content-position="left">Conditions（{{ conditions.length }}）</el-divider>
              <el-table v-if="conditions.length" :data="conditions" border size="small">
                <el-table-column label="类型" prop="type" min-width="180" />
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.status === 'True' ? 'success' : 'danger'">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="原因" prop="reason" min-width="160" />
                <el-table-column label="消息" prop="message" min-width="300" show-overflow-tooltip />
                <el-table-column label="最后更新" prop="lastUpdateTime" min-width="190" />
              </el-table>
              <div v-else class="cell-sub">暂无状态条件</div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- Pods -->
        <el-tab-pane label="Pods" name="pods">
          <el-table v-loading="podsLoading" :data="matchedPods" border size="small" empty-text="未找到匹配的 Pod">
            <el-table-column label="名称" min-width="280">
              <template #default="{ row }">
                <router-link
                  :to="{ name: 'ClusterK8sPodDetail', params: { clusterId: clusterId }, query: { namespace: row.namespace, name: row.name } }"
                  class="link-name">{{ row.name }}</router-link>
              </template>
            </el-table-column>
            <el-table-column label="命名空间" prop="namespace" min-width="160" />
            <el-table-column label="状态" width="120" align="center">
              <template #default="{ row }"><el-tag size="small" :type="podPhaseType(row.phase)">{{ row.phase }}</el-tag></template>
            </el-table-column>
            <el-table-column label="就绪" width="90" align="center">
              <template #default="{ row }">{{ row.ready }}/{{ row.containers }}</template>
            </el-table-column>
            <el-table-column label="重启" prop="restarts" width="90" align="center" />
            <el-table-column label="节点" prop="node_name" min-width="180" />
            <el-table-column label="创建时间" prop="created_at" width="190" />
          </el-table>
        </el-tab-pane>

        <!-- Services -->
        <el-tab-pane label="Services" name="services">
          <div class="tab-toolbar">
            <el-button
              v-if="canOperate"
              type="primary"
              size="small"
              icon="el-icon-plus"
              @click="createService">
              创建 Service
            </el-button>
          </div>
          <el-table v-loading="servicesLoading" :data="matchedServices" border size="small" empty-text="未找到关联的 Service">
            <el-table-column label="名称" min-width="220">
              <template #default="{ row }">
                <router-link
                  :to="{ name: 'ClusterK8sServiceDetail', params: { clusterId: clusterId }, query: { namespace: row.namespace, name: row.name } }"
                  class="link-name">{{ row.name }}</router-link>
              </template>
            </el-table-column>
            <el-table-column label="类型" prop="type" width="120" align="center" />
            <el-table-column label="ClusterIP" prop="cluster_ip" min-width="160" />
            <el-table-column label="端口" min-width="260">
              <template #default="{ row }">{{ portsText(row.ports) }}</template>
            </el-table-column>
            <el-table-column label="选择器" min-width="240">
              <template #default="{ row }">
                <el-tag v-for="(v, k) in row.selector" :key="k" size="small" type="info" class="label-tag">{{ k }}={{ v }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Ingresses -->
        <el-tab-pane label="Ingresses" name="ingresses">
          <div class="tab-toolbar">
            <el-button
              v-if="canOperate"
              type="primary"
              size="small"
              icon="el-icon-plus"
              :disabled="projectMode && !matchedServices.length"
              @click="createIngress">
              创建 Ingress
            </el-button>
          </div>
          <el-table v-loading="ingressesLoading" :data="matchedIngresses" border size="small" empty-text="未找到关联的 Ingress">
            <el-table-column label="名称" prop="name" min-width="220" />
            <el-table-column label="Hosts" prop="hosts" min-width="260" />
            <el-table-column label="后端 Service" min-width="260">
              <template #default="{ row }">
                <el-tag v-for="svc in row.services" :key="svc" size="small" type="info" class="label-tag">{{ svc }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" prop="created_at" width="190" />
          </el-table>
        </el-tab-pane>

        <!-- 资源配置 -->
        <el-tab-pane label="资源配置" name="resources">
          <div v-if="resourceEdit.length" v-loading="resourceSaving">
            <easy-title :level="'h4'">Deployment 资源配置</easy-title>
            <el-alert
              title="资源配置属于当前 Deployment，将统一应用于全部现有及未来副本；保存后会触发滚动更新。"
              type="info"
              :closable="false"
              show-icon />
            <div v-for="(item, i) in resourceEdit" :key="item.name" class="deployment-resource-editor">
              <div v-if="resourceEdit.length > 1" class="container-resource-title">
                容器资源分配 · {{ item.name }}
              </div>
              <resource-config-editor
                :value="item.resources"
                :disabled="resourceSaving"
                @input="val => onResourceInput(i, val)" />
            </div>
            <div class="resource-actions">
              <el-button type="primary" :loading="resourceSaving" icon="el-icon-check" @click="saveResources">更新 Deployment 资源配置</el-button>
              <el-button :disabled="resourceSaving" @click="resetResources">重置</el-button>
            </div>
          </div>
          <div v-else class="cell-sub">该 Deployment 没有容器</div>
        </el-tab-pane>

        <!-- 高级设置 -->
        <el-tab-pane label="高级设置" name="advanced">
          <div v-loading="applySaving">
            <el-alert
              title="高级设置会直接修改 Deployment 的 Pod 模板，保存后将触发滚动更新。应用访问端口请在 Services Tab 中管理。"
              type="warning"
              :closable="false"
              show-icon />
            <div class="advanced-section">
              <easy-title :level="'h4'">Pod 网络高级设置</easy-title>
              <el-form label-width="120px" size="small" class="advanced-form">
                <el-form-item label="Host 网络">
                  <el-switch v-model="advancedEdit.hostNetwork" />
                  <div class="form-tip">开启后 Pod 将直接使用节点网络。可能产生端口冲突，通常不建议业务应用开启。</div>
                </el-form-item>
                <el-form-item label="DNS 策略">
                  <el-select v-model="advancedEdit.dnsPolicy" placeholder="选择 DNS 策略">
                    <el-option label="ClusterFirst" value="ClusterFirst" />
                    <el-option label="ClusterFirstWithHostNet" value="ClusterFirstWithHostNet" />
                    <el-option label="Default" value="Default" />
                    <el-option label="None" value="None" />
                  </el-select>
                  <div class="form-tip">普通 Pod 建议使用 ClusterFirst；Host 网络通常使用 ClusterFirstWithHostNet。</div>
                </el-form-item>
                <template v-if="showCustomDns">
                  <el-form-item label="DNS 服务器">
                    <div v-for="(ns, idx) in advancedEdit.nameservers" :key="idx" class="advanced-list-row">
                      <el-input v-model="advancedEdit.nameservers[idx]" size="small" placeholder="如 1.2.3.4" />
                      <el-button type="text" size="small" class="text-danger" icon="el-icon-delete" @click="advancedEdit.nameservers.splice(idx, 1)" />
                    </div>
                    <el-button type="text" size="small" icon="el-icon-plus" @click="advancedEdit.nameservers.push('')">添加 DNS 服务器</el-button>
                  </el-form-item>
                  <el-form-item label="搜索域">
                    <div v-for="(s, idx) in advancedEdit.searches" :key="idx" class="advanced-list-row">
                      <el-input v-model="advancedEdit.searches[idx]" size="small" placeholder="如 cluster.local" />
                      <el-button type="text" size="small" class="text-danger" icon="el-icon-delete" @click="advancedEdit.searches.splice(idx, 1)" />
                    </div>
                    <el-button type="text" size="small" icon="el-icon-plus" @click="advancedEdit.searches.push('')">添加搜索域</el-button>
                  </el-form-item>
                  <el-form-item label="解析选项">
                    <div v-for="(o, idx) in advancedEdit.options" :key="idx" class="advanced-list-row">
                      <el-input v-model="o.name" size="small" placeholder="名称" class="advanced-option-name" />
                      <el-input v-model="o.value" size="small" placeholder="值" class="advanced-option-value" />
                      <el-button type="text" size="small" class="text-danger" icon="el-icon-delete" @click="advancedEdit.options.splice(idx, 1)" />
                    </div>
                    <el-button type="text" size="small" icon="el-icon-plus" @click="advancedEdit.options.push({ name: '', value: '' })">添加解析选项</el-button>
                  </el-form-item>
                </template>
              </el-form>
            </div>
            <div class="resource-actions">
              <el-button type="primary" :loading="applySaving" icon="el-icon-check" @click="saveAdvancedSettings">保存高级设置</el-button>
              <el-button :disabled="applySaving" @click="initAdvancedSettings">重置</el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 环境变量 -->
        <el-tab-pane label="环境变量" name="env">
          <div v-if="envEdit.length" v-loading="applySaving">
            <div class="reference-summary">
              <span class="reference-summary-label">关联配置：</span>
              <router-link
                v-for="name in relatedConfigMaps"
                :key="'env-cm-' + name"
                :to="configMapRoute(name)"
                class="rel-link">
                ConfigMap · {{ name }}
              </router-link>
              <router-link
                v-for="name in relatedSecrets"
                :key="'env-secret-' + name"
                :to="secretRoute(name)"
                class="rel-link">
                Secret · {{ name }}
              </router-link>
              <span v-if="!relatedConfigMaps.length && !relatedSecrets.length" class="cell-sub">无 ConfigMap 或 Secret 引用</span>
            </div>
            <div v-for="item in envEdit" :key="item.name" class="block">
              <easy-title :level="'h4'">{{ item.name }}</easy-title>
              <div class="sub-title">普通环境变量</div>
              <key-value-editor v-model="item.env" />

              <div class="sub-title">单键引用</div>
              <div v-for="(ref, ri) in item.valueRefs" :key="ri" class="env-ref-row">
                <el-input v-model="ref.envName" size="small" placeholder="环境变量名" class="env-ref-variable" />
                <el-select v-model="ref.type" size="small" class="env-ref-type">
                  <el-option label="ConfigMap" value="configMap" />
                  <el-option label="Secret" value="secret" />
                </el-select>
                <el-input v-model="ref.name" size="small" placeholder="资源名称" class="env-ref-resource" />
                <el-input v-model="ref.key" size="small" placeholder="Key" class="env-ref-key" />
                <el-checkbox v-model="ref.optional">可选</el-checkbox>
                <el-button type="text" size="small" class="text-danger" icon="el-icon-delete" @click="item.valueRefs.splice(ri, 1)" />
              </div>
              <el-button
                type="text"
                size="small"
                icon="el-icon-plus"
                @click="item.valueRefs.push({ envName: '', type: 'configMap', name: '', key: '', optional: false })">
                添加单键引用
              </el-button>

              <div class="sub-title env-from-title">整体引用（envFrom）</div>
              <div v-for="(ef, ei) in item.envFrom" :key="ei" class="env-ref-row">
                <template v-if="!ef._raw">
                  <el-select v-model="ef.type" size="small" class="env-ref-type">
                    <el-option label="ConfigMap" value="configMap" />
                    <el-option label="Secret" value="secret" />
                  </el-select>
                  <el-input v-model="ef.name" size="small" placeholder="资源名称" class="env-ref-resource" />
                  <el-input v-model="ef.prefix" size="small" placeholder="变量前缀（可选）" class="env-ref-prefix" />
                  <el-checkbox v-model="ef.optional">可选</el-checkbox>
                  <el-button type="text" size="small" class="text-danger" icon="el-icon-delete" @click="item.envFrom.splice(ei, 1)" />
                </template>
                <span v-else class="cell-sub">暂不支持编辑的 envFrom 引用将原样保留</span>
              </div>
              <el-button
                type="text"
                size="small"
                icon="el-icon-plus"
                @click="item.envFrom.push({ type: 'configMap', name: '', prefix: '', optional: false })">
                添加整体引用
              </el-button>
              <el-alert
                v-if="item.preservedEnv.length"
                class="preserved-env-alert"
                :title="`${item.preservedEnv.length} 条 Downward API 或资源字段引用暂不支持编辑，保存时将原样保留。`"
                type="info"
                :closable="false"
                show-icon />
            </div>
            <div class="resource-actions">
              <el-button type="primary" :loading="applySaving" icon="el-icon-check" @click="saveEnv">保存环境变量</el-button>
              <el-button :disabled="applySaving" @click="initEditors">重置</el-button>
            </div>
          </div>
          <div v-else class="cell-sub">该 Deployment 没有容器</div>
        </el-tab-pane>

        <!-- 存储与挂载 -->
        <el-tab-pane label="存储与挂载" name="mapping">
          <div v-loading="applySaving">
            <div class="reference-summary">
              <span class="reference-summary-label">关联存储与配置：</span>
              <router-link
                v-for="name in relatedPersistentVolumeClaims"
                :key="'pvc-' + name"
                :to="pvcRoute(name)"
                class="rel-link">
                PVC · {{ name }}
              </router-link>
              <router-link
                v-for="name in mountedConfigMaps"
                :key="'volume-cm-' + name"
                :to="configMapRoute(name)"
                class="rel-link">
                ConfigMap · {{ name }}
              </router-link>
              <router-link
                v-for="name in mountedSecrets"
                :key="'volume-secret-' + name"
                :to="secretRoute(name)"
                class="rel-link">
                Secret · {{ name }}
              </router-link>
              <span
                v-if="!relatedPersistentVolumeClaims.length && !mountedConfigMaps.length && !mountedSecrets.length"
                class="cell-sub">
                无关联资源
              </span>
            </div>
            <div class="block">
              <easy-title :level="'h4'">
                卷（Volumes）
                <template #options><el-button size="small" icon="el-icon-plus" :disabled="applySaving" @click="addVolume">添加卷</el-button></template>
              </easy-title>
              <div v-if="mappingEdit.volumes.length">
                <div v-for="(vol, vi) in mappingEdit.volumes" :key="vi" class="volume-card">
                  <div class="volume-head">
                    <span class="volume-index">卷 {{ vi + 1 }}</span>
                    <template v-if="vol.type === 'other'">
                      <span class="cell-sub">不支持编辑的类型（保留）</span>
                    </template>
                    <el-button
                      v-else
                      type="text"
                      size="small"
                      class="text-danger"
                      icon="el-icon-delete"
                      @click="mappingEdit.volumes.splice(vi, 1)">删除</el-button>
                  </div>
                  <el-form v-if="vol.type !== 'other'" label-width="90px" size="small" class="volume-form">
                    <el-form-item label="类型">
                      <el-select v-model="vol.type" :disabled="!!vol._raw">
                        <el-option label="PVC" value="pvc" />
                        <el-option label="ConfigMap" value="configMap" />
                        <el-option label="Secret" value="secret" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="名称">
                      <el-input v-model="vol.name" placeholder="卷名称（挂载引用）" />
                    </el-form-item>
                    <el-form-item v-if="vol.type === 'pvc'" label="PVC 名称">
                      <el-input v-model="vol.claimName" placeholder="如 data-pvc" />
                    </el-form-item>
                    <el-form-item v-if="vol.type === 'configMap'" label="ConfigMap">
                      <el-input v-model="vol.configMapName" placeholder="如 app-config" />
                    </el-form-item>
                    <el-form-item v-if="vol.type === 'secret'" label="Secret">
                      <el-input v-model="vol.secretName" placeholder="如 app-secret" />
                    </el-form-item>
                    <el-form-item v-if="vol.type === 'pvc'" label="只读">
                      <el-switch v-model="vol.readOnly" />
                    </el-form-item>
                  </el-form>
                </div>
              </div>
              <span v-else class="cell-sub">无卷</span>
            </div>

            <div v-for="item in mappingEdit.containers" :key="item.name" class="block">
              <easy-title :level="'h4'">{{ item.name }}</easy-title>
              <div class="sub-title">卷挂载</div>
              <div v-for="(m, mi) in item.volumeMounts" :key="mi" class="mount-row">
                <el-select v-model="m.name" size="small" placeholder="卷名称" class="mount-name" filterable>
                  <el-option v-for="vol in mappingEdit.volumes" :key="vol.name" :label="vol.name" :value="vol.name" />
                </el-select>
                <el-input v-model="m.mountPath" size="small" placeholder="挂载路径" class="mount-path" />
                <el-input v-model="m.subPath" size="small" placeholder="subPath" class="mount-sub" />
                <el-switch v-model="m.readOnly" size="small" />
                <el-button type="text" size="small" class="text-danger" icon="el-icon-delete" @click="item.volumeMounts.splice(mi, 1)" />
              </div>
              <el-button type="text" size="small" icon="el-icon-plus" @click="item.volumeMounts.push({ name: '', mountPath: '', subPath: '', readOnly: false })">添加挂载</el-button>
            </div>

            <div class="resource-actions">
              <el-button type="primary" :loading="applySaving" icon="el-icon-check" @click="saveMapping">保存</el-button>
              <el-button :disabled="applySaving" @click="initEditors">重置</el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 事件 -->
        <el-tab-pane v-if="!projectMode" label="事件" name="events">
          <easy-title :level="'h4'">
            事件
            <template #options>共 {{ events.length }} 条</template>
          </easy-title>
          <el-table v-loading="eventsLoading" :data="events" border size="small" empty-text="无事件">
            <el-table-column label="类型" prop="type" width="100" align="center">
              <template #default="{ row }"><el-tag size="small" :type="row.type === 'Warning' ? 'warning' : 'info'">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column label="原因" prop="reason" min-width="160" />
            <el-table-column label="消息" prop="message" min-width="300" show-overflow-tooltip />
            <el-table-column label="来源" min-width="180">
              <template #default="{ row }">{{ row.source_component || '-' }}<span v-if="row.source_host"> / {{ row.source_host }}</span></template>
            </el-table-column>
            <el-table-column label="时间" prop="last_timestamp" width="190" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane v-if="projectMode" label="运行告警" name="alerts" lazy>
          <runtime-alerts-events
            :org-id="orgId"
            :group-id="groupId"
            :project-id="projectId"
            :runtime-id="runtimeId"
            section="alerts" />
        </el-tab-pane>
        <el-tab-pane v-if="projectMode" label="运行事件" name="runtime-events" lazy>
          <runtime-alerts-events
            :org-id="orgId"
            :group-id="groupId"
            :project-id="projectId"
            :runtime-id="runtimeId"
            section="events" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
    <workload-image-dialog
      :visible.sync="imageEditing"
      title="设置 Deployment 镜像"
      :images="imageEdit"
      :org-id="orgId"
      :cluster-id="clusterId"
      :saving="applySaving"
      :load-local-images="false"
      notice="更新后 Deployment 将滚动发布；Kubernetes 会在 Pod 调度到节点时拉取镜像，拉取或认证错误可在 Pod 事件中查看。"
      @submit="saveImages" />
  </div>
</template>

<script>
import ClusterBreadcrumb from '@/views/components/Breadcrumb'
import ProjectBreadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '@/views/components/EasyTitle'
import ResourceConfigEditor from '@/views/components/ResourceConfigEditor'
import WorkloadImageDialog from '@/views/components/WorkloadImageDialog'
import KeyValueEditor from './components/KeyValueEditor'
import RuntimeAlertsEvents from '@/views/project/deploy/components/RuntimeAlertsEvents.vue'
import { routeBreadcrumb } from '@/utils/helpers'
import { formatK8sDate } from '@/utils/filters'
import {
  kubernetesClusterDeploymentDetail,
  kubernetesClusterDeploymentDelete, kubernetesClusterDeploymentScale,
  kubernetesClusterDeploymentRestart, kubernetesClusterDeploymentResources,
  kubernetesClusterDeploymentApply,
  kubernetesClusterPods,
  kubernetesClusterServices, kubernetesClusterIngresses,
  kubernetesClusterObjectEvents
} from '@/api/kubernetes'
import {
  projectRuntimeRemove,
  projectRuntimeRestart,
  projectRuntimeScale
} from '@/api/project'

// 安全地把各种可能的字段转为数组（某些清单里 env/envFrom/volumes 可能是对象或缺失）
function asArray (value) {
  return Array.isArray(value) ? value : []
}

export default {
  name: 'ClusterK8sDeploymentDetail',
  components: {
    ClusterBreadcrumb,
    ProjectBreadcrumb,
    EasyTitle,
    ResourceConfigEditor,
    WorkloadImageDialog,
    KeyValueEditor,
    RuntimeAlertsEvents
  },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    cluster: { type: Object, default: () => ({}) },
    project: { type: Object, default: null },
    groupId: { type: [Number, String], default: null },
    projectId: { type: [Number, String], default: null },
    mode: {
      type: String,
      default: 'cluster',
      validator: value => ['cluster', 'project'].includes(value)
    },
    canOperate: { type: Boolean, default: true },
    canDestroy: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      loaded: false,
      error: '',
      deployment: {},
      activeTab: this.$route.query.tab || 'overview',
      podsLoading: false,
      pods: [],
      servicesLoading: false,
      services: [],
      ingressesLoading: false,
      ingresses: [],
      eventsLoading: false,
      events: [],
      scaleVisible: false,
      scaleSaving: false,
      scaleReplicas: 1,
      restarting: false,
      resourceSaving: false,
      resourceEdit: [],
      applySaving: false,
      imageEdit: [],
      imageEditing: false,
      advancedEdit: { hostNetwork: false, dnsPolicy: 'ClusterFirst', nameservers: [], searches: [], options: [] },
      envEdit: [],
      mappingEdit: { volumes: [], containers: [] }
    }
  },
  computed: {
    namespace () { return this.$route.query.namespace || '' },
    deploymentName () { return this.$route.query.name || '' },
    projectMode () { return this.mode === 'project' },
    runtimeId () { return Number(this.$route.params.runtimeId || this.$route.query.runtime_id || 0) },
    breadcrumbComponent () {
      return this.projectMode ? 'ProjectBreadcrumb' : 'ClusterBreadcrumb'
    },
    breadcrumbSubject () {
      return this.projectMode
        ? { project: this.project || {} }
        : { cluster: this.cluster || {} }
    },
    breadcrumb () {
      if (this.projectMode) {
        return [
          ...routeBreadcrumb(this),
          {
            title: '运行实例',
            to: {
              name: 'ProjectInstance',
              params: { groupId: this.groupId, projectId: this.projectId }
            }
          },
          { title: this.deploymentName, to: '' }
        ]
      }
      return [
        ...routeBreadcrumb(this),
        { title: 'Deployments', to: { name: 'ClusterK8sDeployments', params: { clusterId: this.clusterId } } },
        { title: this.deploymentName, to: '' }
      ]
    },
    spec () { return this.deployment.spec || {} },
    status () { return this.deployment.status || {} },
    templateSpec () { return (this.spec.template && this.spec.template.spec) || {} },
    podMeta () { return (this.spec.template && this.spec.template.metadata) || {} },
    deploymentLabelsObj () { return (this.deployment.metadata && this.deployment.metadata.labels) || {} },
    podTemplateLabelsObj () { return this.podMeta.labels || {} },
    selectorLabelsObj () {
      const selector = this.spec.selector || {}
      return selector.matchLabels || {}
    },
    selectorLabels () { return Object.keys(this.selectorLabelsObj) },
    // Pod 实际标签（来自模板，selector 必须为其子集），用于匹配 Service
    podLabels () {
      const template = this.spec.template || {}
      const templateMeta = template.metadata || {}
      return templateMeta.labels || this.selectorLabelsObj
    },
    updateStrategyText () {
      const us = this.spec.strategy
      if (!us || !us.type) return 'RollingUpdate'
      if (us.type === 'Recreate') return 'Recreate'
      const rolling = us.rollingUpdate || {}
      const maxSurge = rolling.maxSurge != null ? rolling.maxSurge : '-'
      const maxUnavailable = rolling.maxUnavailable != null ? rolling.maxUnavailable : '-'
      return `RollingUpdate (maxSurge: ${maxSurge}, maxUnavailable: ${maxUnavailable})`
    },
    replicaStatusType () {
      const desired = Number(this.spec.replicas || 0)
      const ready = Number(this.status.readyReplicas || 0)
      if (ready >= desired) return 'success'
      return ready > 0 ? 'warning' : 'danger'
    },
    currentReplicas () {
      return Number(this.spec.replicas || 0)
    },
    scaleMax () {
      return Math.max(this.currentReplicas * 8, 1)
    },
    scaleMarks () {
      const marks = { 0: '0' }
      marks[this.currentReplicas] = String(this.currentReplicas)
      marks[this.scaleMax] = String(this.scaleMax)
      return marks
    },
    conditions () {
      return (this.status.conditions || []).map(c => ({
        type: c.type,
        status: c.status,
        reason: c.reason || '-',
        message: c.message || '-',
        lastUpdateTime: c.lastUpdateTime || '-'
      }))
    },
    matchedPods () {
      if (!this.selectorLabels.length) return this.pods
      return this.pods.filter(pod => {
        const labels = pod.labels || {}
        return this.selectorLabels.every(key => labels[key] === this.selectorLabelsObj[key])
      })
    },
    matchedServices () {
      if (!this.services.length) return []
      return this.services.filter(svc => {
        const sel = svc.selector || {}
        return Object.keys(sel).every(key => this.podLabels[key] === sel[key])
      })
    },
    matchedIngresses () {
      if (!this.ingresses.length) return []
      const svcNames = this.matchedServices.map(s => s.name)
      return this.ingresses.filter(ing => (ing.services || []).some(s => svcNames.indexOf(s) !== -1))
    },
    showCustomDns () {
      return this.advancedEdit.dnsPolicy === 'None' ||
        this.advancedEdit.dnsPolicy === 'ClusterFirstWithHostNet'
    },
    relatedConfigMaps () {
      const templateSpec = (this.spec.template && this.spec.template.spec) || {}
      const containers = [...(asArray(templateSpec.containers)), ...(asArray(templateSpec.initContainers))]
      const names = new Set()
      containers.forEach(c => {
        asArray(c.env).forEach(e => {
          const vf = e.valueFrom || {}
          if (vf.configMapKeyRef) names.add(vf.configMapKeyRef.name)
        })
        asArray(c.envFrom).forEach(ef => { if (ef.configMapRef) names.add(ef.configMapRef.name) })
      })
      return [...names].filter(Boolean)
    },
    relatedSecrets () {
      const templateSpec = (this.spec.template && this.spec.template.spec) || {}
      const containers = [...(asArray(templateSpec.containers)), ...(asArray(templateSpec.initContainers))]
      const names = new Set()
      containers.forEach(c => {
        asArray(c.env).forEach(e => {
          const vf = e.valueFrom || {}
          if (vf.secretKeyRef) names.add(vf.secretKeyRef.name)
        })
        asArray(c.envFrom).forEach(ef => { if (ef.secretRef) names.add(ef.secretRef.name) })
      })
      return [...names].filter(Boolean)
    },
    relatedPersistentVolumeClaims () {
      const volumes = asArray(this.templateSpec.volumes)
      return [...new Set(volumes
        .map(volume => volume.persistentVolumeClaim && volume.persistentVolumeClaim.claimName)
        .filter(Boolean))]
    },
    mountedConfigMaps () {
      const names = new Set()
      asArray(this.templateSpec.volumes).forEach(volume => {
        if (volume.configMap) names.add(volume.configMap.name)
        if (volume.projected) {
          asArray(volume.projected.sources).forEach(source => {
            if (source.configMap) names.add(source.configMap.name)
          })
        }
      })
      return [...names].filter(Boolean)
    },
    mountedSecrets () {
      const names = new Set()
      asArray(this.templateSpec.volumes).forEach(volume => {
        if (volume.secret) names.add(volume.secret.secretName)
        if (volume.projected) {
          asArray(volume.projected.sources).forEach(source => {
            if (source.secret) names.add(source.secret.name)
          })
        }
      })
      return [...names].filter(Boolean)
    }
  },
  created () {
    this.load()
    if (this.activeTab === 'services') this.loadServices()
    if (this.activeTab === 'ingresses') {
      this.loadServices()
      this.loadIngresses()
    }
  },
  methods: {
    goBack () {
      this.$router.push(this.projectMode
        ? {
            name: 'ProjectInstance',
            params: {
              groupId: this.groupId,
              projectId: this.projectId
            }
          }
        : {
            name: 'ClusterK8sDeployments',
            params: { clusterId: this.clusterId }
          })
    },
    load () {
      if (!this.deploymentName) { this.error = '缺少 Deployment 名称'; return }
      this.loading = true
      this.error = ''
      kubernetesClusterDeploymentDetail(this.orgId, this.clusterId, this.namespace, this.deploymentName).then(res => {
        this.deployment = res.data.deployment || {}
        this.loaded = true
        this.initEditors()
      }).catch(err => {
        this.error = err.response?.data?.msg || err.response?.data?.message || '获取详情失败'
      }).finally(() => { this.loading = false })
    },
    // ---- 资源配置 ----
    parseCpuCores (value) {
      const text = String(value || '').trim()
      if (!text) return 0
      return text.endsWith('m') ? Number(text.slice(0, -1)) / 1000 : Number(text)
    },
    parseMemoryMiB (value) {
      const text = String(value || '').trim()
      if (!text) return 0
      if (text.endsWith('Gi')) return Number(text.slice(0, -2)) * 1024
      if (text.endsWith('Ki')) return Number(text.slice(0, -2)) / 1024
      return Number(text.replace(/Mi$/, ''))
    },
    initResources () {
      const containers = (this.spec.template && this.spec.template.spec && this.spec.template.spec.containers) || []
      this.resourceEdit = containers.map(c => ({
        name: c.name,
        resources: this.parseResources(c.resources || {})
      }))
    },
    parseResources (resources) {
      const req = resources.requests || {}
      const lim = resources.limits || {}
      return {
        cpu_reservation: this.parseCpuCores(req.cpu),
        memory_reservation: this.parseMemoryMiB(req.memory),
        cpu_limit: this.parseCpuCores(lim.cpu),
        memory_limit: this.parseMemoryMiB(lim.memory)
      }
    },
    k8sResources (r) {
      const reqCpu = Math.round(Number(r.cpu_reservation || 0) * 1000)
      const reqMem = Math.round(Number(r.memory_reservation || 0))
      const limCpu = Math.round(Number(r.cpu_limit || 0) * 1000)
      const limMem = Math.round(Number(r.memory_limit || 0))
      const out = {}
      if (reqCpu || reqMem) {
        out.requests = {}
        if (reqCpu) out.requests.cpu = reqCpu + 'm'
        if (reqMem) out.requests.memory = reqMem + 'Mi'
      }
      if (limCpu || limMem) {
        out.limits = {}
        if (limCpu) out.limits.cpu = limCpu + 'm'
        if (limMem) out.limits.memory = limMem + 'Mi'
      }
      return out
    },
    onResourceInput (index, value) {
      this.$set(this.resourceEdit, index, Object.assign({}, this.resourceEdit[index], { resources: value }))
    },
    resetResources () {
      this.initEditors()
    },
    // ---- 初始化所有可编辑模型 ----
    initEditors () {
      this.imageEditing = false
      this.initResources()
      this.initImages()
      this.initAdvancedSettings()
      this.initEnv()
      this.initMapping()
    },
    buildContainers (mutator) {
      const original = this.templateSpec.containers || []
      return original.map((c, i) => {
        const clone = JSON.parse(JSON.stringify(c))
        return mutator(clone, i) || clone
      })
    },
    applyDeployment (fragment) {
      this.applySaving = true
      kubernetesClusterDeploymentApply(this.orgId, this.clusterId, this.namespace, this.deploymentName, fragment).then(() => {
        this.$message.success('已更新')
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.applySaving = false })
    },
    // 镜像设置
    initImages () {
      const containers = this.templateSpec.containers || []
      this.imageEdit = containers.map(c => ({ name: c.name, image: c.image || '' }))
    },
    startEditImages () {
      this.initImages()
      this.imageEditing = true
    },
    saveImages (images) {
      const selections = new Map(images.map(item => [item.key || item.name, item.image]))
      const fragment = {
        containers: this.buildContainers(c => {
          if (selections.has(c.name)) c.image = selections.get(c.name)
          return c
        })
      }
      this.applySaving = true
      kubernetesClusterDeploymentApply(
        this.orgId,
        this.clusterId,
        this.namespace,
        this.deploymentName,
        fragment
      ).then(() => {
        this.$message.success('镜像已更新，Deployment 正在滚动发布')
        this.imageEditing = false
        return this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '更新失败')
      }).finally(() => { this.applySaving = false })
    },
    // Pod 高级设置
    initAdvancedSettings () {
      const ts = this.templateSpec
      const dc = ts.dnsConfig || {}
      this.advancedEdit = {
        hostNetwork: !!ts.hostNetwork,
        dnsPolicy: ts.dnsPolicy || 'ClusterFirst',
        nameservers: (dc.nameservers || []).slice(),
        searches: (dc.searches || []).slice(),
        options: (dc.options || []).map(o => ({ name: o.name || '', value: o.value || '' }))
      }
    },
    saveAdvancedSettings () {
      const settings = this.advancedEdit
      const fragment = {
        hostNetwork: !!settings.hostNetwork,
        dnsPolicy: settings.dnsPolicy,
        dnsConfig: null
      }
      if (this.showCustomDns) {
        fragment.dnsConfig = {
          nameservers: (settings.nameservers || []).filter(Boolean),
          searches: (settings.searches || []).filter(Boolean),
          options: (settings.options || []).filter(o => o && o.name).map(o => ({ name: o.name, value: o.value || '' }))
        }
      }
      this.applyDeployment(fragment)
    },
    configMapRoute (name) {
      return {
        name: 'ClusterK8sConfigMapEdit',
        params: { clusterId: this.clusterId },
        query: { namespace: this.namespace, name }
      }
    },
    secretRoute (name) {
      return {
        name: 'ClusterK8sSecretEdit',
        params: { clusterId: this.clusterId },
        query: { namespace: this.namespace, name }
      }
    },
    pvcRoute (name) {
      return {
        name: 'ClusterK8sPersistentVolumeClaimDetail',
        params: { clusterId: this.clusterId },
        query: { namespace: this.namespace, name }
      }
    },
    // 环境变量
    initEnv () {
      const containers = this.templateSpec.containers || []
      this.envEdit = containers.map(container => {
        const env = []
        const valueRefs = []
        const preservedEnv = []
        asArray(container.env).forEach(item => {
          const valueFrom = item.valueFrom || {}
          const configMapRef = valueFrom.configMapKeyRef
          const secretRef = valueFrom.secretKeyRef
          if (configMapRef || secretRef) {
            const ref = configMapRef || secretRef
            valueRefs.push({
              envName: item.name || '',
              type: configMapRef ? 'configMap' : 'secret',
              name: ref.name || '',
              key: ref.key || '',
              optional: !!ref.optional
            })
          } else if (item.valueFrom) {
            preservedEnv.push(JSON.parse(JSON.stringify(item)))
          } else {
            env.push({ key: item.name || '', value: item.value || '' })
          }
        })
        const envFrom = asArray(container.envFrom).map(item => {
          const configMapRef = item.configMapRef
          const secretRef = item.secretRef
          if (!configMapRef && !secretRef) return { _raw: JSON.parse(JSON.stringify(item)) }
          const ref = configMapRef || secretRef
          return {
            type: configMapRef ? 'configMap' : 'secret',
            name: ref.name || '',
            prefix: item.prefix || '',
            optional: !!ref.optional
          }
        })
        return { name: container.name, env, valueRefs, envFrom, preservedEnv }
      })
    },
    saveEnv () {
      const fragment = {
        containers: this.buildContainers((c, i) => {
          const edited = this.envEdit[i]
          if (edited) {
            const literals = edited.env
              .filter(item => item.key)
              .map(item => ({ name: item.key, value: item.value }))
            const valueRefs = edited.valueRefs
              .filter(item => item.envName && item.name && item.key)
              .map(item => {
                const ref = { name: item.name, key: item.key, optional: !!item.optional }
                return {
                  name: item.envName,
                  valueFrom: {
                    [item.type === 'configMap' ? 'configMapKeyRef' : 'secretKeyRef']: ref
                  }
                }
              })
            c.env = [...literals, ...valueRefs, ...edited.preservedEnv]
            c.envFrom = edited.envFrom
              .filter(item => item._raw || item.name)
              .map(item => {
                if (item._raw) return item._raw
                const ref = { name: item.name, optional: !!item.optional }
                const result = {
                  [item.type === 'configMap' ? 'configMapRef' : 'secretRef']: ref
                }
                if (item.prefix) result.prefix = item.prefix
                return result
              })
          }
          return c
        })
      }
      this.applyDeployment(fragment)
    },
    // PVC/Config/Secret 映射
    normalizeVolume (v) {
      if (v.persistentVolumeClaim) {
        return { type: 'pvc', name: v.name, claimName: (v.persistentVolumeClaim.claimName) || '', readOnly: !!v.persistentVolumeClaim.readOnly, _raw: v }
      }
      if (v.configMap) {
        return { type: 'configMap', name: v.name, configMapName: (v.configMap.name) || '', _raw: v }
      }
      if (v.secret) {
        return { type: 'secret', name: v.name, secretName: (v.secret.secretName) || '', _raw: v }
      }
      return { type: 'other', name: v.name, _raw: v }
    },
    buildVolume (vol) {
      if (vol.type === 'other' && vol._raw) return vol._raw
      if (vol.type === 'pvc') return { name: vol.name, persistentVolumeClaim: { claimName: vol.claimName, readOnly: !!vol.readOnly } }
      if (vol.type === 'configMap') return { name: vol.name, configMap: { name: vol.configMapName } }
      if (vol.type === 'secret') return { name: vol.name, secret: { secretName: vol.secretName } }
      return vol._raw || { name: vol.name }
    },
    initMapping () {
      const ts = this.templateSpec
      const volumes = (ts.volumes || []).map(v => this.normalizeVolume(v))
      const containers = (ts.containers || []).map(c => ({
        name: c.name,
        volumeMounts: (c.volumeMounts || []).map(m => ({
          name: m.name, mountPath: m.mountPath, subPath: m.subPath || '', readOnly: !!m.readOnly
        }))
      }))
      this.mappingEdit = { volumes, containers }
    },
    addVolume () {
      this.mappingEdit.volumes.push({ type: 'pvc', name: '', claimName: '', readOnly: false })
    },
    saveMapping () {
      const volumeNames = this.mappingEdit.volumes.map(v => v.name).filter(Boolean)
      for (const item of this.mappingEdit.containers) {
        for (const m of item.volumeMounts) {
          if (m.name && m.mountPath && !volumeNames.includes(m.name)) {
            return this.$message.warning(`容器 ${item.name} 的卷挂载引用了不存在的卷：${m.name}`)
          }
        }
      }
      const fragment = {
        volumes: this.mappingEdit.volumes.map(v => this.buildVolume(v)),
        containers: this.buildContainers((c, i) => {
          const e = this.mappingEdit.containers[i]
          if (e) {
            c.volumeMounts = e.volumeMounts
              .filter(m => m.name && m.mountPath)
              .map(m => {
                const mount = { name: m.name, mountPath: m.mountPath }
                if (m.subPath) mount.subPath = m.subPath
                if (m.readOnly) mount.readOnly = true
                return mount
              })
          }
          return c
        })
      }
      this.applyDeployment(fragment)
    },
    saveResources () {
      const original = (this.spec.template && this.spec.template.spec && this.spec.template.spec.containers) || []
      if (!original.length) return
      const payloadContainers = original.map((c, i) => {
        const clone = JSON.parse(JSON.stringify(c))
        const edited = this.resourceEdit[i]
        if (edited) clone.resources = this.k8sResources(edited.resources)
        return clone
      })
      this.resourceSaving = true
      kubernetesClusterDeploymentResources(this.orgId, this.clusterId, this.namespace, this.deploymentName, payloadContainers).then(() => {
        this.$message.success('Deployment 资源配置已更新，正在滚动发布')
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '保存失败')
      }).finally(() => { this.resourceSaving = false })
    },
    onTabClick (tab) {
      if (tab.name === 'pods' && !this.pods.length) this.loadPods()
      if (tab.name === 'services' && !this.services.length) this.loadServices()
      if (tab.name === 'ingresses') {
        if (!this.services.length) this.loadServices()
        if (!this.ingresses.length) this.loadIngresses()
      }
      if (tab.name === 'events' && !this.events.length) this.loadEvents()
    },
    createService () {
      this.$router.push({
        name: this.projectMode
          ? 'ProjectKubernetesServiceCreate'
          : 'ClusterK8sServiceCreate',
        params: this.projectMode
          ? {
              groupId: this.groupId,
              projectId: this.projectId,
              runtimeId: this.runtimeId
            }
          : { clusterId: this.clusterId },
        query: {
          cluster_id: this.clusterId,
          namespace: this.namespace,
          deployment: this.deploymentName
        }
      })
    },
    createIngress () {
      const service = this.matchedServices[0] || null
      this.$router.push({
        name: this.projectMode
          ? 'ProjectKubernetesIngressCreate'
          : 'ClusterK8sIngressCreate',
        params: this.projectMode
          ? {
              groupId: this.groupId,
              projectId: this.projectId,
              runtimeId: this.runtimeId
            }
          : { clusterId: this.clusterId },
        query: {
          cluster_id: this.clusterId,
          namespace: this.namespace,
          deployment: this.deploymentName,
          service: service ? service.name : '',
          service_port: service && service.ports && service.ports.length
            ? Number(service.ports[0].port || 80)
            : 80
        }
      })
    },
    loadPods () {
      this.podsLoading = true
      kubernetesClusterPods(this.orgId, this.clusterId, this.namespace).then(res => {
        this.pods = res.data.pods || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载 Pods 失败')
      }).finally(() => { this.podsLoading = false })
    },
    loadServices () {
      this.servicesLoading = true
      kubernetesClusterServices(this.orgId, this.clusterId, this.namespace).then(res => {
        this.services = res.data.services || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载 Services 失败')
      }).finally(() => { this.servicesLoading = false })
    },
    loadIngresses () {
      this.ingressesLoading = true
      kubernetesClusterIngresses(this.orgId, this.clusterId, this.namespace).then(res => {
        this.ingresses = res.data.ingresses || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载 Ingresses 失败')
      }).finally(() => { this.ingressesLoading = false })
    },
    loadEvents () {
      this.eventsLoading = true
      kubernetesClusterObjectEvents(this.orgId, this.clusterId, 'Deployment', this.deploymentName).then(res => {
        this.events = res.data.events || []
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '加载事件失败')
      }).finally(() => { this.eventsLoading = false })
    },
    meta (key) { return (this.deployment.metadata && this.deployment.metadata[key] != null) ? this.deployment.metadata[key] : '-' },
    formatK8sDate,
    specVal (key) { return this.spec[key] != null ? this.spec[key] : '-' },
    statusVal (key) { return this.status[key] != null ? this.status[key] : '-' },
    portsText (ports) {
      if (!ports || !ports.length) return '-'
      return ports.map(p => {
        const tp = p.target_port != null && p.target_port !== '' ? ':' + p.target_port : ''
        return `${p.port}/${p.protocol || 'TCP'}${tp}`
      }).join(', ')
    },
    podPhaseType (phase) {
      if (phase === 'Running') return 'success'
      if (phase === 'Pending') return 'warning'
      if (phase === 'Failed') return 'danger'
      return 'info'
    },
    openScale () {
      this.scaleReplicas = this.currentReplicas
      this.scaleVisible = true
    },
    confirmScale () {
      this.scaleSaving = true
      const request = this.projectMode
        ? projectRuntimeScale(
          this.orgId,
          this.groupId,
          this.projectId,
          this.runtimeId,
          this.scaleReplicas
        )
        : kubernetesClusterDeploymentScale(
          this.orgId,
          this.clusterId,
          this.namespace,
          this.deploymentName,
          this.scaleReplicas
        )
      request.then(() => {
        this.$message.success('已触发伸缩')
        this.scaleVisible = false
        this.load()
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '伸缩失败')
      }).finally(() => { this.scaleSaving = false })
    },
    restart () {
      this.$confirm('确定要滚动重启该 Deployment？', '提示', { type: 'warning' }).then(() => {
        this.restarting = true
        const request = this.projectMode
          ? projectRuntimeRestart(
            this.orgId,
            this.groupId,
            this.projectId,
            this.runtimeId
          )
          : kubernetesClusterDeploymentRestart(
            this.orgId,
            this.clusterId,
            this.namespace,
            this.deploymentName
          )
        request.then(() => {
          this.$message.success('已触发滚动重启')
          this.load()
        }).catch(err => {
          this.$message.error(err.response?.data?.msg || err.response?.data?.message || '重启失败')
        }).finally(() => { this.restarting = false })
      }).catch(() => {})
    },
    remove () {
      const request = this.projectMode
        ? projectRuntimeRemove(
          this.orgId,
          this.groupId,
          this.projectId,
          this.runtimeId
        )
        : kubernetesClusterDeploymentDelete(
          this.orgId,
          this.clusterId,
          this.namespace,
          this.deploymentName
        )
      request.then(() => {
        this.$message.success(this.projectMode ? '实例已删除' : 'Deployment 已删除')
        this.$router.push(this.projectMode
          ? {
              name: 'ProjectInstance',
              params: { groupId: this.groupId, projectId: this.projectId }
            }
          : {
              name: 'ClusterK8sDeployments',
              params: { clusterId: this.clusterId }
            })
      }).catch(err => {
        this.$message.error(err.response?.data?.msg || err.response?.data?.message || '删除失败')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.error-alert {
  margin: 16px 20px 0;
  border-radius: 6px;
}
.header-card {
  margin: 20px 20px 0;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
  ::v-deep .el-card__body { padding: 16px 20px; }
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.deployment-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}
.deployment-name {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.deployment-meta {
  color: #909399;
  font-size: 13px;
}
.ops-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #ebeef5;
}
.inline-section {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 4px;
  background: #f5f7fa;
}
.inline-label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}
.scale-slider {
  width: 100%;
  max-width: 520px;
}
.content-card {
  margin: 16px 20px 20px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
  ::v-deep .el-card__body { padding: 0 20px 20px; }
}
.detail-tabs {
  ::v-deep .el-tabs__header { margin-bottom: 12px; }
  ::v-deep .el-tabs__item { font-size: 14px; font-weight: 500; }
}
.mono { font-family: "SF Mono", Menlo, Monaco, Consolas, monospace; }
.tab-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.label-tag { margin: 0 6px 6px 0; }
.overview-section { margin-top: 18px; }
.readonly-panel { min-height: 84px; padding: 12px 14px; border: 1px solid #ebeef5; border-radius: 6px; background: #fafafa; }
.readonly-panel-title { margin-bottom: 9px; color: #606266; font-size: 13px; font-weight: 500; }
.deployment-image { display: flex; align-items: center; gap: 8px; min-width: 0; }
.deployment-image + .deployment-image { margin-top: 6px; }
.container-name { flex: 0 0 auto; color: #909399; font-size: 12px; }
.image-edit-button { margin-left: 6px; }
.link-name { color: #409eff; &:hover { text-decoration: underline; } }
.cell-sub { color: #909399; }
.text-danger { color: #f56c6c; }

.resource-actions { margin-top: 16px; display: flex; gap: 10px; }
.deployment-resource-editor { margin-top: 16px; }
.container-resource-title { margin-bottom: 10px; color: #606266; font-size: 13px; font-weight: 600; }
.reference-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafafa;
}
.reference-summary-label { color: #606266; font-size: 13px; font-weight: 600; }
.rel-link {
  display: inline-block; max-width: 100%;
  padding: 2px 10px; border-radius: 12px;
  background: #ecf5ff; color: #409eff; font-size: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  &:hover { background: #409eff; color: #fff; text-decoration: none; }
}

// 镜像、环境变量等容器级编辑块
.block { margin-bottom: 18px; }
.tag-wrap { margin-bottom: 8px; }
.env-ref-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.env-ref-variable { width: 180px; }
.env-ref-type { width: 130px; }
.env-ref-resource { width: 210px; }
.env-ref-key { width: 150px; }
.env-ref-prefix { width: 190px; }
.env-from-title { margin-top: 18px; }
.preserved-env-alert { margin-top: 12px; }

// 高级设置
.advanced-section { margin-top: 20px; }
.advanced-form { max-width: 680px; }
.advanced-list-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.advanced-option-name { width: 180px; }
.advanced-option-value { flex: 1; }

// 说明提示
.form-tip { color: #909399; font-size: 12px; margin-top: 8px; line-height: 1.5; }

// 卷与挂载
.volume-card { border: 1px solid #ebeef5; border-radius: 4px; padding: 12px; margin-bottom: 12px; background: #fafafa; }
.volume-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.volume-index { font-weight: 600; color: #303133; }
.volume-form { max-width: 560px; }
.sub-title { font-weight: 600; color: #303133; margin: 8px 0; }
.mount-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.mount-name { width: 160px; }
.mount-path { flex: 1; min-width: 200px; }
.mount-sub { width: 140px; }

@media (max-width: 768px) {
  .header-card,
  .content-card,
  .error-alert {
    margin-right: 12px;
    margin-left: 12px;
  }
  .header-row {
    align-items: flex-start;
  }
  .deployment-meta {
    width: 100%;
  }
}
</style>
