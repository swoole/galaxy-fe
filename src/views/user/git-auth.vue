<template>
  <div class="user-main box-shadow">
    <easy-title title="Git授权访问" margin-set="0 20" />

    <div class="desc-normal" style="margin-bottom: 20px;">
      此授权访问用于本平台获取私有Git仓库的分支、标签、代码提交记录等信息，不会用于其他用途。
    </div>

    <div class="table-operator">
      <el-button size="small" type="primary" @click="handleCreate">新建授权</el-button>
    </div>

    <el-table
      class="my-orgs"
      v-loading="tableLoading"
      :data="tableData"
      :show-overflow-tooltip="true">
      <el-table-column
        prop="vendor"
        label="厂商"
        width="100">
        <template #default="{ row }">
          {{ GIT_VENDORS[row.vendor] ? GIT_VENDORS[row.vendor].label : '未知厂商' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="domain"
        label="Git 服务地址"
        min-width="220">
      </el-table-column>
      <el-table-column
        prop="token"
        label="Token">
      </el-table-column>
      <el-table-column
        prop="created_at"
        label="创建时间"
        align="center"
        width="180">
        <template #default="{ row }">
          {{ row.created_at | formatDate }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        align="center"
        width="100">
        <template #default="{ row }">
          <el-link v-if="!row.protected" type="primary" @click="handleEdit(row)">编辑</el-link>
          <el-tooltip v-else effect="dark" content="该授权禁止编辑" placement="top-end">
            <el-link disabled type="primary">编辑</el-link>
          </el-tooltip>
          <el-divider direction="vertical"></el-divider>
          <el-link v-if="!row.protected" type="danger" @click="handleDelete(row)">删除</el-link>
          <el-tooltip v-else effect="dark" content="该授权禁止删除" placement="top-end">
            <el-link disabled type="danger">删除</el-link>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- Service/新建 -->
    <el-dialog :title="createForm.id ? '编辑Git授权' : '创建Git授权'" :visible.sync="dialogCreateVisible" :close-on-click-modal="false">
      <el-form
        :model="createForm"
        class="dialog-form"
        label-width="120px"
        ref="create-form"
        :rules="createFormRules"
        @submit.native.prevent
      >
        <el-form-item label="厂商" prop="vendor">
          <el-radio-group v-model="createForm.vendor">
            <el-radio
              v-for="(prop, vendor) in GIT_VENDORS"
              :key="vendor"
              :label="Number(vendor)">{{ prop.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Token" prop="token">
          <el-input
            type="textarea"
            class="dialog-form-item-control"
            placeholder="请输入Token"
            v-model="createForm.token"
            maxlength="2000"
            show-word-limit />
          <el-alert v-if="GIT_VENDORS[createForm.vendor]" class="clear-line-height form-tips" type="info" :closable="false">
            授权Token的获取可以参考文档
            <a
              class="text-link"
              :href="manual + GIT_VENDORS[createForm.vendor].tokenGetDocs"
              target="_blank">
              {{ GIT_VENDORS[createForm.vendor].label }}授权认证
            </a>
            中Token获取部分。
          </el-alert>
        </el-form-item>
        <el-form-item label="服务地址" prop="domain">
          <el-input
            v-model="createForm.domain"
            class="dialog-form-item-control"
            :disabled="createForm.disableDomain"
            placeholder="例如 git.example.com 或 http://git.example.com:3000" />
          <el-alert
            v-if="String(createForm.domain || '').toLowerCase().startsWith('http://')"
            class="clear-line-height form-tips"
            type="warning"
            :closable="false"
            title="HTTP 连接会以未加密方式传输 Git Token，仅建议在可信内网使用。" />
          <el-alert v-if="!GIT_VENDOR_PROTECT_DOMAINS[createForm.vendor] && GIT_VENDORS[createForm.vendor]" class="clear-line-height form-tips" type="info" :closable="false">
            授权域名的获取可以参考文档
            <a
              class="text-link"
              :href="manual + GIT_VENDORS[createForm.vendor].tokenGetDocs"
              target="_blank">
              {{ GIT_VENDORS[createForm.vendor].label }}授权认证
            </a>
            中域名获取部分。
          </el-alert>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogCreateVisible = false">取消</el-button>
        <el-button v-if="createForm.id" type="primary" @click="submitUpdate">确定</el-button>
        <el-button v-else type="primary" @click="submitCreate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import EasyTitle from '../components/EasyTitle'
import { formatDate } from '@/utils/filters'
import { formatInArrayNumber, formatInObjectNumber } from '@/utils/helpers'
import {
  actGitAuths,
  actCreateGitAuth,
  actUpdateGitAuth,
  actRemoveGitAuth
} from '@/api/account'
import {
  GIT_VENDORS,
  GIT_VENDOR_PROTECT_DOMAINS
} from '@/consts/project'
import clipboard from '@/directive/clipboard/index.js'

export default {
  name: 'UserGitAuth',
  components: {
    EasyTitle
  },
  filters: {
    formatDate
  },
  directives: {
    clipboard
  },
  data () {
    return {
      // 表格数据
      tableData: [],
      tableLoading: false,
      // 常量定义
      GIT_VENDORS,
      GIT_VENDOR_PROTECT_DOMAINS,
      // 创建/更新
      dialogCreateVisible: false,
      createForm: {
        id: null,
        vendor: null,
        domain: null,
        disableDomain: false,
        token: null
      },
      createFormRules: {
        vendor: [
          { required: true, message: '请选择厂商', trigger: 'blur' }
        ],
        domain: [
          { required: true, message: '请填写域名', trigger: 'blur' }
        ],
        token: [
          { required: true, message: '请填写Token', trigger: 'blur' }
        ]
      }
    }
  },
  watch: {
    'createForm.vendor' (vendor) {
      // 设置protect domain
      if (GIT_VENDOR_PROTECT_DOMAINS[vendor]) {
        this.$set(this.createForm, 'domain', GIT_VENDOR_PROTECT_DOMAINS[vendor])
        this.$set(this.createForm, 'disableDomain', true)
      } else {
        this.$set(this.createForm, 'disableDomain', false)
        // 如果是设置的protect domain，则置空
        Object.values(GIT_VENDOR_PROTECT_DOMAINS).forEach(domain => {
          if (domain == this.createForm.domain) {
            this.$set(this.createForm, 'domain', null)
          }
        })
      }
    }
  },
  computed: {
    // 文档地址
    manual () {
      return this.$store.state.settings.manual
    }
  },
  created () {
    this.getList()

    // 自动弹出创建
    if (!isNaN(parseInt(this.$route.query.vendor)) && this.$route.query.domain) {
      this.createForm = {
        id: null,
        vendor: parseInt(this.$route.query.vendor),
        domain: this.$route.query.domain,
        disableDomain: !!GIT_VENDOR_PROTECT_DOMAINS[parseInt(this.$route.query.vendor)],
        token: null
      }
      this.dialogCreateVisible = true
    }
  },
  methods: {
    // 加载授权列表
    getList () {
      this.tableLoading = true
      actGitAuths().then(res => {
        this.tableData = formatInArrayNumber(res.data.auths, ['id', 'vendor', 'created_at'])
      }).finally(() => {
        this.tableLoading = false
      })
    },
    // 触发创建授权
    handleCreate () {
      this.createForm = {
        id: null,
        vendor: null,
        domain: null,
        disableDomain: false,
        token: null
      }
      this.dialogCreateVisible = true
    },
    // 提交创建授权
    submitCreate () {
      this.$refs['create-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          actCreateGitAuth(
            this.createForm.vendor,
            this.createForm.domain,
            this.createForm.token
          ).then(res => {
            this.$message.success('添加成功')
            this.dialogCreateVisible = false
            this.tableData.unshift(formatInObjectNumber(res.data.auth, 'id', 'vendor', 'created_at'))
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 触发编辑授权
    handleEdit (row) {
      this.createForm = {
        id: row.id,
        vendor: row.vendor,
        domain: row.domain,
        disableDomain: !!GIT_VENDOR_PROTECT_DOMAINS[row.vendor],
        token: null
      }
      this.dialogCreateVisible = true
    },
    // 提交更新授权
    submitUpdate () {
      this.$refs['create-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          actUpdateGitAuth(
            this.createForm.vendor,
            this.createForm.domain,
            this.createForm.token
          ).then(res => {
            this.$message.success('更新成功')
            this.dialogCreateVisible = false
            this.tableData.forEach((item, index) => {
              if (item.vendor == this.createForm.vendor && item.domain == this.createForm.domain) {
                this.tableData.splice(index, 1, formatInObjectNumber(res.data.auth, 'id', 'vendor', 'created_at'))
              }
            })
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 删除授权
    handleDelete (row) {
      this.$confirm(`您确定要删除此授权吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        actRemoveGitAuth(row.vendor, row.domain)
          .then(res => {
            this.$message.success('删除成功')
            this.tableData.forEach((item, index) => {
              if (item.vendor == row.vendor && item.domain == row.domain) {
                this.tableData.splice(index, 1)
              }
            })
          })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.user-main {
  width: 100%;
  background: #fff;
  padding: 25px 15px;
}

.box-shadow {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.dialog-form {
  .dialog-form-item-control {
    width: 420px;
  }
  .form-tips {
    width: 420px;
    margin-top: 10px;
  }
}
</style>
