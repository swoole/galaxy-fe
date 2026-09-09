<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <easy-title title="镜像仓库" margin-set="0 20" />

      <div class="table-tools">
        <div class="table-tools-left">
          <el-button type="primary" size="small" @click="handleAdd">添加帐号</el-button>
        </div>
        <div class="table-tools-right">
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入关键词进行搜索"
            class="table-tools-filter table-tools-input-keyword"
            size="small"
            clearable
            @keyup.enter.native="handleFilter">
            <el-button slot="append" type="primary" size="small" icon="el-icon-search" @click="handleFilter">
              搜索
            </el-button>
          </el-input>
        </div>
      </div>

      <el-table
        style="width: 100%; margin-top: 20px; "
        :data="tableData"
        v-loading="tableLoading"
        fit
        highlight-current-row
      >
        <el-table-column
          label="仓库地址"
          width="320"
        >
          <template #default="{ row }">
            <el-tag v-if="row.address" :type="Number(row.proto) === 1 ? 'success' : 'warning'" size="mini" style="margin-right: 6px;">
              {{ Number(row.proto) === 1 ? 'HTTPS' : 'HTTP' }}
            </el-tag>
            <template v-if="row.address">{{ row.address }}</template>
            <code v-else>DockerHub</code>
            <el-tooltip
              v-if="row.is_push"
              effect="dark"
              content="项目构建的镜像等将推送至此仓库"
              placement="top"
              style="margin-left: 5px;">
              <el-tag type="success" size="mini">推送</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          label="命名空间"
          width="160"
        >
          <template #default="{ row }">
            <template v-if="row.namespace">{{ row.namespace }}</template>
            <code v-else>*</code>
          </template>
        </el-table-column>
        <el-table-column
          label="帐号"
          prop="username"
          width="160"
        >
        </el-table-column>
        <el-table-column
          label="备注"
          prop="remark"
        >
        </el-table-column>
        <el-table-column label="项目组授权" align="center" width="110">
          <template #default="{ row }">
            <el-link type="primary" @click="handleGroupGrants(row)">
              {{ Number(row.group_grants_count || 0) }} 个
            </el-link>
          </template>
        </el-table-column>
        <el-table-column
          label="创建人"
          prop="creator"
          align="center"
          width="150"
        >
          <template #default="{ row }">
            <org-user :user="row.creator_info" />
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          align="center"
          width="160"
        >
          <template #default="{ row }">
            {{ row.created_at | formatDate }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          align="center"
          width="120"
        >
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row)">编辑</el-link>
            <el-divider direction="vertical"></el-divider>
            <el-dropdown trigger="hover">
              <span class="el-dropdown-link">
                <el-link type="primary" :underline="false">
                  更多<i class="el-icon-arrow-down el-icon--right"></i>
                </el-link>
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item>
                  <el-link type="primary" :underline="false" @click="handleBrowse(row)">浏览仓库</el-link>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-link type="primary" :underline="false" @click="handleShowPassword(row)">查看密码</el-link>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-link type="primary" :underline="false" @click="handleGroupGrants(row)">项目组权限</el-link>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-link
                    type="success"
                    :underline="false"
                    :disabled="!!row.is_push"
                    @click="handleSetPush(row)">设为镜像推送仓库</el-link>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-link type="danger" :underline="false" @click="handleDelete(row)">删除</el-link>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="page"
        :limit.sync="pageSize"
        style="position: absolute; right: 0"
        @pagination="getList"/>

      <section class="mapping-section">
        <easy-title title="镜像映射" margin-set="36 16" />
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="部署时按“集群映射 > 当前组织全局映射 > 原始镜像”解析。未配置映射的集群直接使用上游镜像；目标私有仓库凭据从本页帐号中自动匹配。"
          style="margin-bottom: 16px" />
        <div class="table-tools">
          <div class="table-tools-left">
            <el-button type="primary" size="small" icon="el-icon-plus" @click="handleMappingAdd">添加映射</el-button>
          </div>
          <div class="table-tools-right">
            <el-button size="small" icon="el-icon-refresh" :loading="mappingLoading" @click="loadMappings">刷新</el-button>
          </div>
        </div>
        <el-table :data="mappingRows" v-loading="mappingLoading" fit>
          <el-table-column label="作用范围" width="180">
            <template #default="{ row }">
              <el-tag :type="Number(row.cluster_id) > 0 ? 'warning' : 'info'" size="mini">
                {{ Number(row.cluster_id) > 0 ? '集群' : '组织全局' }}
              </el-tag>
              <span class="mapping-scope">{{ row.cluster_title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="源镜像" min-width="280">
            <template #default="{ row }"><image-reference :value="row.source_image" compact /></template>
          </el-table-column>
          <el-table-column label="目标镜像" min-width="360">
            <template #default="{ row }">
              <i class="el-icon-right mapping-arrow"></i>
              <image-reference :value="row.target_image" compact />
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="mini">{{ row.enabled ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-link type="primary" @click="handleMappingEdit(row)">编辑</el-link>
              <el-divider direction="vertical" />
              <el-popconfirm title="确定删除此镜像映射？" @confirm="deleteMapping(row)">
                <el-link slot="reference" type="danger">删除</el-link>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <!-- 添加帐号 -->
    <el-dialog
      :title="addForm.registryId ? '编辑帐号' : '添加帐号'"
      :visible.sync="dialogAddVisible"
      :close-on-click-modal="false">
      <el-form
        :model="addForm"
        class="dialog-form"
        label-width="120px"
        ref="add-form"
        :rules="addFormRules"
        @submit.native.prevent="submitAdd"
      >
        <el-form-item label="仓库地址" prop="address">
          <el-input
            v-model="addForm.address"
            class="dialog-form-item-control"
            placeholder="例如 hub.code-galaxy.net" />
          <span class="little-tips" style="margin-left: 10px;">
            如果为<code>DockerHub（hub.docker.com）</code>请置空
          </span>
        </el-form-item>
        <el-form-item label="连接协议" prop="proto">
          <el-radio-group v-model="addForm.proto" :disabled="!addForm.address">
            <el-radio-button :label="1">HTTPS</el-radio-button>
            <el-radio-button :label="0">HTTP</el-radio-button>
          </el-radio-group>
          <span class="little-tips" style="margin-left: 10px;">
            内网自建仓库可选择 HTTP；DockerHub 始终使用 HTTPS
          </span>
          <el-alert
            v-if="addForm.address && Number(addForm.proto) === 0"
            class="clear-line-height"
            type="warning"
            :closable="false"
            style="margin-top: 10px;">
            使用 HTTP 前，请确保 BuildKit 与所有 Docker Swarm 节点已将该地址配置为 insecure registry
          </el-alert>
        </el-form-item>
        <el-form-item label="命名空间" prop="namespace">
          <el-input
            v-model="addForm.namespace"
            class="dialog-form-item-control"
            placeholder="例如 code-galaxy，如果对所有命名空间有权限请置空" />
          <span class="little-tips" style="margin-left: 10px;">
            如果对所有命名空间有权限请置空
          </span>
        </el-form-item>
        <el-form-item label="帐号" prop="username">
          <el-input
            v-model="addForm.username"
            class="dialog-form-item-control"
            placeholder="例如 myaccount" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="addForm.password"
            type="password"
            :show-password="true"
            class="dialog-form-item-control"
            :placeholder="addForm.registryId ? '留空则保持现有密码' : '例如 mypassword'" />
          <span v-if="addForm.registryId" class="little-tips" style="margin-left: 10px;">
            不会回填现有密码；留空保持不变，只有输入新密码才会覆盖
          </span>
          <el-alert class="clear-line-height" type="warning" style="margin-top: 10px;">
            密码会在平台数据库中加密保存，仅在构建、镜像校验和 Swarm 拉取镜像时解密使用；请勿复用个人密码
          </el-alert>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addForm.remark"
            :maxlength="200"
            :rows="5"
            type="textarea"
            class="dialog-form-item-control"
            placeholder="备注，选填，不能超过200个字符串长度" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogAddVisible = false">取消</el-button>
        <el-button v-if="addForm.registryId" type="primary" @click="submitUpdate">确定</el-button>
        <el-button v-else type="primary" @click="submitAdd">确定</el-button>
      </div>
    </el-dialog>

    <el-dialog
      :title="mappingForm.id ? '编辑镜像映射' : '添加镜像映射'"
      :visible.sync="mappingVisible"
      width="720px"
      :close-on-click-modal="false">
      <el-form ref="mapping-form" :model="mappingForm" :rules="mappingRules" label-width="110px">
        <el-form-item label="作用范围" prop="scope">
          <el-radio-group v-model="mappingForm.scope">
            <el-radio-button label="global">当前组织全部集群</el-radio-button>
            <el-radio-button label="cluster">指定集群</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="mappingForm.scope === 'cluster'" label="集群" prop="cluster_id">
          <el-select v-model="mappingForm.cluster_id" filterable placeholder="请选择集群" style="width: 100%">
            <el-option v-for="cluster in mappingClusters" :key="cluster.id" :label="cluster.title" :value="cluster.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="源镜像" prop="source_image">
          <el-input v-model.trim="mappingForm.source_image" placeholder="例如 prom/node-exporter:v1.8.2" />
          <div class="little-tips">填写产品或应用声明的上游标准镜像，必须精确匹配。</div>
        </el-form-item>
        <el-form-item label="目标镜像" prop="target_image">
          <el-input v-model.trim="mappingForm.target_image" placeholder="例如 mirror.example.com/infra/node-exporter:v1.8.2" />
          <div class="little-tips">若目标为私有仓库，请先在上方配置对应仓库帐号。</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="mappingForm.remark" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="mappingForm.enabled" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="mappingVisible = false">取消</el-button>
        <el-button type="primary" :loading="mappingSaving" @click="saveMapping">保存</el-button>
      </div>
    </el-dialog>

    <!-- 查看密码 -->
    <el-dialog
      title="密码查看提示"
      :visible.sync="dialogPasswordVisible"
      :close-on-click-modal="false"
      width="520px">
      <el-result icon="success" title="密码已获取成功，请注意保密" style="padding: 0;">
        <template slot="extra">
          <el-input v-model="showPassword" size="medium" readonly style="width: 480px;">
            <el-button
              slot="append"
              type="primary"
              icon="el-icon-copy-document"
              v-clipboard:copy="showPassword"
              v-clipboard:success="() => $message.success('复制成功')">复制</el-button>
          </el-input>
        </template>
      </el-result>
      <div slot="footer" class="dialog-footer">
        <el-button size="medium" @click="dialogPasswordVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="项目组权限"
      :visible.sync="groupGrantVisible"
      :close-on-click-modal="false"
      width="760px">
      <el-alert
        :closable="false"
        type="info"
        show-icon
        title="只有已授权的项目组可以在项目、Pipeline、构建和制品导入中使用该仓库。namespace 同时作为镜像路径边界。"
        style="margin-bottom: 14px" />
      <el-table :data="groupGrantRows" v-loading="groupGrantLoading" border max-height="460">
        <el-table-column label="允许" width="76" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.granted" />
          </template>
        </el-table-column>
        <el-table-column label="项目组" min-width="190">
          <template #default="{ row }">
            <div>{{ row.title }}</div>
            <code>{{ row.alias }}</code>
          </template>
        </el-table-column>
        <el-table-column label="允许的 namespace" min-width="330">
          <template #default="{ row }">
            <el-input
              v-model.trim="row.namespace"
              size="small"
              :disabled="!row.granted"
              placeholder="例如 code-galaxy/team-a" />
          </template>
        </el-table-column>
      </el-table>
      <div v-if="groupGrantRegistry" class="little-tips" style="margin-top: 10px">
        仓库凭据 namespace：
        <code>{{ groupGrantRegistry.namespace || '*' }}</code>
        <template v-if="groupGrantRegistry.namespace">
          。项目组 namespace 必须等于它或位于其子路径下。
        </template>
      </div>
      <div slot="footer">
        <el-button @click="groupGrantVisible = false">取消</el-button>
        <el-button type="primary" :loading="groupGrantSaving" @click="saveGroupGrants">保存权限</el-button>
      </div>
    </el-dialog>

    <id-confirm ref="id-confirm" />

    <!-- 浏览仓库 Drawer -->
    <el-drawer
      :title="'浏览仓库 · ' + (browseRegistry ? genName(browseRegistry) : '')"
      :visible.sync="browseVisible"
      :close-on-press-escape="false"
      size="720px">
      <div class="browse-toolbar">
        <el-input
          v-model="repoSearch"
          placeholder="搜索仓库名称..."
          clearable
          prefix-icon="el-icon-search"
          size="small"
          style="width: 260px"
          @input="filterRepos" />
        <el-button size="small" icon="el-icon-refresh" :loading="browseLoading" @click="loadCatalog">刷新</el-button>
      </div>
      <div class="browse-body" v-loading="browseLoading">
        <div class="repo-panel">
          <div class="panel-title">Repositories <span class="panel-count">({{ filteredRepos.length }})</span></div>
          <div class="repo-list">
            <div
              v-for="repo in filteredRepos"
              :key="repo"
              class="repo-item"
              :class="{ active: selectedRepo === repo }"
              @click="selectRepo(repo)">
              <i class="el-icon-folder-opened"></i> {{ repo }}
            </div>
            <div v-if="!filteredRepos.length" class="cell-sub">暂无仓库</div>
          </div>
        </div>
        <div class="tag-panel">
          <div class="panel-title">Tags <span v-if="selectedRepo" class="panel-count">({{ tags.length }})</span></div>
          <div class="tag-list" v-loading="tagsLoading">
            <template v-if="selectedRepo">
              <div v-for="tag in tags" :key="tag" class="tag-item">
                <el-tag size="small" type="info">{{ tag }}</el-tag>
                <el-popconfirm
                  title="确定删除此镜像？"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  @confirm="deleteImage(selectedRepo, tag)">
                  <el-button
                    slot="reference"
                    size="mini"
                    type="danger"
                    plain
                    icon="el-icon-delete"
                    class="tag-delete">删除</el-button>
                </el-popconfirm>
              </div>
              <div v-if="!tags.length" class="cell-sub">暂无标签</div>
            </template>
            <div v-else class="cell-sub tag-placeholder">选择左侧仓库查看标签</div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb.vue'
import EasyTitle from '@/views/components/EasyTitle.vue'
import Pagination from '@/components/Pagination'
import OrgUser from '@/views/components/OrgUser.vue'
import IdConfirm from '@/views/components/IdConfirm.vue'
import clipboard from '@/directive/clipboard/index.js'
import { formatDate } from '@/utils/filters'
import {
  registryList,
  registryCreate,
  registryUpdate,
  registryDelete,
  registrySetPush,
  registryGroupGrants,
  registryGroupGrantsSave,
  registryShowPassword,
  registryCatalog,
  registryTags,
  registryDeleteImage,
  registryImageMappings,
  registryImageMappingSave,
  registryImageMappingDelete
} from '@/api/project'
import { clusterSimple } from '@/api/cluster'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'SystemConfigRegistry',
  components: {
    Breadcrumb,
    EasyTitle,
    Pagination,
    OrgUser,
    IdConfirm
  },
  props: {
    orgId: {
      type: [Number, String],
      required: true
    }
  },
  filters: {
    formatDate
  },
  directives: {
    clipboard
  },
  data () {
    return {
      // 筛选表单
      filterForm: {
        keyword: null
      },
      page: 1,
      pageSize: 20,
      total: 0,
      tableData: [],
      tableLoading: false,
      dialogAddVisible: false,
      addForm: {
        registryId: null,
        address: null,
        username: null,
        password: null,
        remark: null,
        namespace: null,
        proto: 1
      },
      addFormRules: {
        username: [
          { required: true, message: '请填写用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请填写密码', trigger: 'blur' }
        ]
      },
      dialogPasswordVisible: false,
      showPassword: null,
      browseVisible: false,
      browseLoading: false,
      browseRegistry: null,
      repos: [],
      repoSearch: '',
      selectedRepo: '',
      tags: [],
      tagsLoading: false,
      groupGrantVisible: false,
      groupGrantLoading: false,
      groupGrantSaving: false,
      groupGrantRegistry: null,
      groupGrantRows: [],
      mappingLoading: false,
      mappingSaving: false,
      mappingVisible: false,
      mappingRows: [],
      mappingClusters: [],
      mappingForm: this.emptyMappingForm(),
      mappingRules: {
        scope: [{ required: true, message: '请选择作用范围', trigger: 'change' }],
        cluster_id: [{ required: true, message: '请选择集群', trigger: 'change' }],
        source_image: [{ required: true, message: '请填写源镜像', trigger: 'blur' }],
        target_image: [{ required: true, message: '请填写目标镜像', trigger: 'blur' }]
      }
    }
  },
  computed: {
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    filteredRepos () {
      if (!this.repoSearch) return this.repos
      const kw = this.repoSearch.toLowerCase()
      return this.repos.filter(r => r.toLowerCase().includes(kw))
    }
  },
  watch: {
    'addForm.registryId' (val) {
      if (val) {
        this.$set(this.addFormRules, 'password', [])
      } else {
        this.$set(this.addFormRules, 'password', [
          { required: true, message: '请填写密码', trigger: 'blur' }
        ])
      }
    }
  },
  created () {
    this.getList()
    this.loadMappings()
    clusterSimple(this.orgId).then(res => {
      this.mappingClusters = res.data.clusters || []
    })
  },
  methods: {
    emptyMappingForm () {
      return { id: null, scope: 'global', cluster_id: null, source_image: '', target_image: '', remark: '', enabled: true }
    },
    getList () {
      this.tableLoading = true
      registryList(this.orgId, this.filterForm.keyword, this.page, this.pageSize).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        this.tableData = res.data.data
      }).finally(() => {
        this.tableLoading = false
      })
    },
    // 过滤
    handleFilter () {
      this.page = 1
      this.getList()
    },
    // 添加
    handleAdd () {
      this.addForm = {
        registryId: null,
        address: null,
        username: null,
        password: null,
        remark: null,
        namespace: null,
        proto: 1
      }
      this.dialogAddVisible = true
    },
    // 提交创建
    submitAdd () {
      this.$refs['add-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          registryCreate(
            this.orgId,
            this.addForm.address,
            this.addForm.username,
            this.addForm.password,
            this.addForm.remark,
            this.addForm.namespace,
            this.addForm.address ? Number(this.addForm.proto) : 1
          ).then(res => {
            this.dialogAddVisible = false
            this.$message.success('添加成功')
            this.getList()
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 编辑
    handleEdit (row) {
      this.addForm = {
        registryId: row.id,
        address: row.address,
        username: row.username,
        password: '',
        remark: row.remark,
        namespace: row.namespace,
        proto: Number(row.proto) === 0 ? 0 : 1
      }
      this.dialogAddVisible = true
    },
    // 提交更新
    submitUpdate () {
      this.$refs['add-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          registryUpdate(
            this.orgId,
            this.addForm.registryId,
            this.addForm.address,
            this.addForm.username,
            this.addForm.password,
            this.addForm.remark,
            this.addForm.namespace,
            this.addForm.address ? Number(this.addForm.proto) : 1
          ).then(res => {
            this.dialogAddVisible = false
            this.$message.success('更新成功')
            this.getList()
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 删除账号
    handleDelete (row) {
      const cb = token => {
        const loading = this.$loading()
        registryDelete(this.orgId, row.id, token).then(res => {
          this.$message.success('删除成功')

          // 完成验证
          this.$refs['id-confirm'].finish()

          // 移除数据
          this.tableData.forEach((item, index) => {
            if (item.id == row.id) {
              this.tableData.splice(index, 1)
            }
          })
        }).finally(() => {
          loading.close()
        })
      }
      this.$refs['id-confirm'].confirm(`删除帐号【${this.genName(row)}】`, cb.bind(this))
    },
    // 查看密码
    handleShowPassword (row) {
      // 已缓存密码则直接展示
      if (row.password) {
        this.showPassword = row.password
        this.dialogPasswordVisible = true
        return
      }

      const cb = token => {
        const loading = this.$loading()
        registryShowPassword(this.orgId, row.id, token).then(res => {
          row.password = res.data.password

          // 完成验证
          this.$refs['id-confirm'].finish()

          // 展示密码
          this.showPassword = res.data.password
          this.dialogPasswordVisible = true
        }).finally(() => {
          loading.close()
        })
      }
      this.$refs['id-confirm'].confirm(`查看帐号【${this.genName(row)}】的密码`, cb.bind(this))
    },
    // 设置镜像推送仓库
    handleSetPush (row) {
      this.$confirm(`您确定要将【${this.genName(row)}】设置为镜像推送仓库？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        registrySetPush(this.orgId, row.id).then(res => {
          this.$message.success('设置成功')
          this.getList()
        }).finally(() => {
          loading.close()
        })
      })
    },
    handleGroupGrants (row) {
      this.groupGrantRegistry = row
      this.groupGrantRows = []
      this.groupGrantVisible = true
      this.groupGrantLoading = true
      registryGroupGrants(this.orgId, row.id).then(res => {
        this.groupGrantRows = (res.data.groups || []).map(item => ({ ...item }))
      }).finally(() => {
        this.groupGrantLoading = false
      })
    },
    saveGroupGrants () {
      const grants = this.groupGrantRows
        .filter(item => item.granted)
        .map(item => ({ group_id: item.id, namespace: (item.namespace || '').trim() }))
      const missing = grants.find(item => !item.namespace)
      if (missing) {
        this.$message.warning('已授权的项目组必须填写 namespace')
        return
      }
      this.groupGrantSaving = true
      registryGroupGrantsSave(this.orgId, this.groupGrantRegistry.id, grants).then(() => {
        this.$message.success('项目组权限已更新')
        this.groupGrantVisible = false
        this.getList()
      }).finally(() => {
        this.groupGrantSaving = false
      })
    },
    // 生成仓库名称
    genName (row) {
      return `${row.username}@${row.address || 'DockerHub'}${row.namespace ? '/' + row.namespace : ''}`
    },
    // 浏览仓库
    handleBrowse (row) {
      this.browseRegistry = row
      this.browseVisible = true
      this.selectedRepo = ''
      this.tags = []
      this.repoSearch = ''
      this.loadCatalog()
    },
    loadCatalog () {
      this.browseLoading = true
      registryCatalog(this.orgId, this.browseRegistry.id, this.repoSearch).then(res => {
        this.repos = res.data.repos || []
      }).finally(() => { this.browseLoading = false })
    },
    filterRepos () {
      // computed filteredRepos handles this
    },
    selectRepo (repo) {
      this.selectedRepo = repo
      this.tagsLoading = true
      registryTags(this.orgId, this.browseRegistry.id, repo).then(res => {
        this.tags = res.data.tags || []
      }).finally(() => { this.tagsLoading = false })
    },
    deleteImage (repo, tag) {
      registryDeleteImage(this.orgId, this.browseRegistry.id, repo, tag).then(() => {
        this.$message.success('已删除 ' + repo + ':' + tag)
        this.selectRepo(repo)
      })
    },
    loadMappings () {
      this.mappingLoading = true
      registryImageMappings(this.orgId).then(res => {
        this.mappingRows = res.data.items || []
      }).finally(() => { this.mappingLoading = false })
    },
    handleMappingAdd () {
      this.mappingForm = this.emptyMappingForm()
      this.mappingVisible = true
    },
    handleMappingEdit (row) {
      this.mappingForm = {
        id: row.id,
        scope: Number(row.cluster_id) > 0 ? 'cluster' : 'global',
        cluster_id: Number(row.cluster_id) > 0 ? Number(row.cluster_id) : null,
        source_image: row.source_image,
        target_image: row.target_image,
        remark: row.remark || '',
        enabled: !!row.enabled
      }
      this.mappingVisible = true
    },
    saveMapping () {
      this.$refs['mapping-form'].validate(valid => {
        if (!valid) return
        this.mappingSaving = true
        registryImageMappingSave(this.orgId, this.mappingForm).then(() => {
          this.$message.success('镜像映射已保存；下次部署或更新工作负载时生效')
          this.mappingVisible = false
          this.loadMappings()
        }).finally(() => { this.mappingSaving = false })
      })
    },
    deleteMapping (row) {
      registryImageMappingDelete(this.orgId, row.id).then(() => {
        this.$message.success('镜像映射已删除')
        this.loadMappings()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  padding-bottom: 100px;
  .table-tools {
    position: relative;
    margin-bottom: 20px;
    .table-tools-left {
      display: inline-block;
    }
    .table-tools-right {
      float: right;
      .table-tools-filter {
        margin-left: 10px;
      }
      .table-tools-input-keyword {
        width: 360px;
      }
    }
  }
}

.dialog-form {
  .dialog-form-item-control {
    width: 420px;
  }
}

.mapping-section {
  clear: both;
  padding-top: 28px;
}
.mapping-scope {
  margin-left: 8px;
}
.mapping-arrow {
  margin-right: 8px;
  color: #909399;
}
.image-code {
  white-space: normal;
  overflow-wrap: anywhere;
}

.browse-toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 0 20px 16px;
}
.browse-body {
  display: flex; height: calc(100vh - 140px);
  padding: 0 20px;
}
.repo-panel {
  width: 280px; border-right: 1px solid #ebeef5;
  overflow-y: auto; padding-right: 16px;
}
.panel-title {
  font-size: 14px; font-weight: 600; color: #303133;
  padding: 8px 0 12px;
  .panel-count { font-weight: 400; color: #909399; font-size: 13px; }
}
.repo-list, .tag-list {
  overflow-y: auto;
}
.repo-item {
  padding: 8px 12px; cursor: pointer; border-radius: 4px;
  font-size: 13px; color: #606266;
  &:hover { background: #f5f7fa; }
  &.active { background: #ecf5ff; color: #409eff; font-weight: 600; }
  i { margin-right: 6px; color: #e6a23c; font-size: 14px; }
}
.tag-panel {
  flex: 1; padding-left: 16px; overflow-y: auto;
}
.tag-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid #f0f2f5;
}
.tag-delete {
  margin-left: 12px;
}
.tag-placeholder {
  margin-top: 40px; text-align: center;
}
.cell-sub { color: #909399; font-size: 13px; }
</style>
