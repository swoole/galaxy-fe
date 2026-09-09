<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
      <div class="table-tools">
        <div v-if="canManage" class="table-tools-left">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleAdd">添加成员</el-button>
          <el-button type="primary" size="small" @click="handleBatchEdit">批量编辑</el-button>
          <el-button type="warning" size="small" @click="handleBatchRemove">批量移除</el-button>
        </div>
        <div class="table-tools-right">
          <el-select
            v-model="filterForm.role"
            class="table-tools-filter"
            size="small"
            clearable
            placeholder="角色筛选"
            @change="handleFilter">
            <el-option
              v-for="(role, roleId) in ROLES"
              :key="roleId"
              :label="role.label"
              :value="Number(roleId)">
            </el-option>
          </el-select>
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入姓名或邮箱进行搜索"
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
        @selection-change="handleTableSelect"
      >
        <el-table-column
          v-if="canManage"
          type="selection"
          width="55"
          align="center"
        >
        </el-table-column>
        <el-table-column
          label="姓名"
          prop="realname"
          align="center"
        />
        <el-table-column
          label="工号"
          prop="workcode"
          align="center"
        />
        <el-table-column
          label="邮箱"
          align="center"
        >
          <template #default="{ row }">
            {{ row.user ? row.user.email : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="角色"
          prop="role"
          align="center"
        >
          <template #default="{ row }">
            <org-member-role :role="row.role"></org-member-role>
          </template>
        </el-table-column>
        <el-table-column
          label="加入时间"
          prop="join_at"
          align="center"
        >
          <template #default="{ row }">
            {{ row.join_at | formatDate }}
          </template>
        </el-table-column>
        <el-table-column
          v-if="canManage"
          label="操作"
          align="center"
        >
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row)">编辑</el-link>
            <el-divider direction="vertical"></el-divider>
            <el-link :disabled="row.role == ROLE_MANAGER" type="warning" @click="handleRemove(row)">移除</el-link>
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
        @pagination="getList" />
    </div>

    <!-- 添加成员 -->
    <el-dialog title="添加成员" width="560px" :visible.sync="dialogAddVisible" :close-on-click-modal="false">
      <el-form
        :model="addForm"
        class="invite-form"
        label-width="80px"
        ref="add-form"
        :rules="addFormRules"
        @submit.native.prevent="submitAdd"
      >
        <el-form-item label="用户" prop="uid">
          <el-select
            name="uid"
            class="invite-form-item-control"
            v-model="addForm.uid"
            filterable
            remote
            placeholder="请输入真实姓名、用户名或邮箱进行搜索"
            :remote-method="searchUser"
            :loading="search.loading">
            <el-option
              v-for="item in search.options"
              :key="item.id"
              :label="userOptionLabel(item)"
              :value="item.id">
              <img :src="item.avatar | userAvatar('32x32')" alt="用户头像" class="account-avatar"/>
              <span class="account-nickname">{{ item.nickname || item.username || item.email }}</span>
              <span class="account-email">{{ item.email }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="addForm.role"
            class="invite-form-item-control"
            clearable
            placeholder="请选择">
            <el-option
              v-for="(role, roleId) in ROLES"
              :key="roleId"
              :label="role.label"
              :value="Number(roleId)">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogAddVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">添加</el-button>
      </div>
    </el-dialog>

    <!-- 编辑成员 -->
    <el-dialog title="编辑成员" width="560px" :visible.sync="dialogEditVisible" :close-on-click-modal="false">
      <el-form
        :model="editForm"
        class="invite-form"
        label-width="80px"
        ref="edit-form"
        :rules="editFormRules"
        @submit.native.prevent="submitUpdate"
      >
        <el-form-item label="姓名" prop="realname">
          <el-input v-model="editForm.realname" class="invite-form-item-control" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="工号" prop="workcode">
          <el-input v-model="editForm.workcode" class="invite-form-item-control" placeholder="工号，选填" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="editForm.role"
            class="invite-form-item-control"
            clearable
            placeholder="请选择">
            <el-option
              v-for="(role, roleId) in ROLES"
              :key="roleId"
              :label="role.label"
              :value="Number(roleId)">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogEditVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUpdate">确定</el-button>
      </div>
    </el-dialog>

    <!-- 批量编辑成员 -->
    <el-dialog
      title="编辑成员"
      :visible.sync="dialogBatchEditVisible"
      :close-on-click-modal="false"
    >
      <el-form
        :model="batchEditForm"
        class="invite-form"
        label-width="120px"
        ref="batch-edit-form"
        :rules="batchEditFormRules"
        @submit.native.prevent="submitBatchUpdate"
      >
        <el-form-item label="编辑对象">
          <code
            v-for="(row, index) in batchEditForm.rows"
            :key="index">
            {{ row.realname }}
          </code>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="batchEditForm.role"
            class="invite-form-item-control"
            clearable
            placeholder="请选择">
            <el-option
              v-for="(role, roleId) in ROLES"
              :key="roleId"
              :label="role.label"
              :value="Number(roleId)">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogBatchEditVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchUpdate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import EasyTitle from '../../components/EasyTitle'
import { formatDate, userAvatar } from '@/utils/filters'
import {
  orgMember,
  orgMemberAdd,
  orgMemberProfileUpdate,
  orgMemberBatchRole,
  orgMemberRemove,
  orgMemberBatchRemove,
  orgMemberSearch
} from '@/api/org-member'
import Breadcrumb from '../../components/Breadcrumb'
import OrgUser from '../../components/OrgUser'
import {
  ROLES,
  ROLE_MANAGER,
  ROLE_GENERAL
} from '@/consts/org'
import Pagination from '@/components/Pagination'
import OrgMemberRole from '@/views/components/OrgMemberRole'
import { formatInArrayNumber, routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'OrgMember',
  components: {
    EasyTitle,
    Breadcrumb,
    OrgUser,
    Pagination,
    OrgMemberRole
  },
  filters: {
    formatDate,
    OrgUser,
    userAvatar
  },
  data () {
    return {
      // 筛选表单
      filterForm: {
        role: null,
        keyword: null
      },
      // 组织成员常量配置
      ROLES,
      ROLE_MANAGER,
      // 添加成员对话框
      dialogAddVisible: false,
      search: {
        loading: false,
        options: []
      },
      addForm: {
        uid: null,
        role: ROLE_GENERAL
      },
      addFormRules: {
        uid: [
          { required: true, message: '请输入真实姓名、用户名或邮箱进行搜索', trigger: 'blur' }
        ],
        role: [
          { required: true, message: '请选择角色', trigger: 'change' }
        ]
      },
      tableData: [],
      tableSelectRows: [],
      tableLoading: false,
      page: 1,
      pageSize: 20,
      total: 0,
      // 编辑成员对话框显示
      dialogEditVisible: false,
      editForm: {
        uid: null,
        realname: null,
        workcode: null,
        role: null
      },
      editFormRules: {
        realname: [
          { required: true, message: '请输入姓名', trigger: 'blur' },
          { max: 10, message: '姓名不能超过10个字符串长度', trigger: 'blur' }
        ],
        workcode: [
          { max: 50, message: '工号不能超过50个字符串长度', trigger: 'blur' }
        ],
        role: [
          { required: true, message: '请选择角色', trigger: 'blur' }
        ]
      },
      // 批量编辑成员对话框显示
      dialogBatchEditVisible: false,
      batchEditForm: {
        role: null,
        rows: []
      },
      batchEditFormRules: {
        rows: [
          { required: true, message: '请选择要批量编辑的对象', trigger: 'blur' }
        ],
        role: [
          { required: true, message: '请选择角色', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    orgRole () {
      return this.$store.state.user.lastOrg.role
    },
    canManage () {
      return this.$p('org.member', this.orgRole)
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '成员管理', to: '' },
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    // 加载组织成员列表
    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      orgMember(
        this.orgId,
        this.filterForm.role,
        this.filterForm.keyword,
        this.page,
        this.pageSize
      ).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        this.tableData = formatInArrayNumber(res.data.data, ['id', 'join_at', 'role'])
      }).finally(() => {
        this.tableLoading = false
      })
    },
    // 执行筛选
    handleFilter () {
      this.page = 1
      this.getList()
    },
    // 打开添加成员弹窗
    handleAdd () {
      this.addForm = {
        uid: null,
        role: ROLE_GENERAL
      }
      this.search.options = []
      this.dialogAddVisible = true
    },
    // 搜索用戶
    searchUser (queryString) {
      if (queryString !== '') {
        this.search.loading = true
        orgMemberSearch(this.orgId, queryString).then(res => {
          this.search.options = res.data || []
        }).finally(() => {
          this.search.loading = false
        })
      } else {
        this.addForm.uid = null
        this.search.options = []
      }
    },
    userOptionLabel (user) {
      const name = user.nickname || user.username || user.email || `用户 #${user.id}`
      return user.email && user.email !== name ? `${name}（${user.email}）` : name
    },
    // 提交添加成员
    submitAdd () {
      // 表单校验
      this.$refs['add-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          orgMemberAdd(
            this.orgId,
            this.addForm.role,
            this.addForm.uid
          ).then(res => {
            this.dialogAddVisible = false
            this.$message.success('成员添加成功')
            this.getList()
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 触发编辑
    handleEdit (row) {
      this.editForm = {
        uid: row.uid,
        realname: row.realname,
        workcode: row.workcode,
        role: row.role
      }
      this.dialogEditVisible = true
    },
    // 提交更新
    submitUpdate () {
      // 表单校验
      this.$refs['edit-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          orgMemberProfileUpdate(
            this.orgId,
            this.editForm.uid,
            this.editForm.realname,
            this.editForm.workcode,
            this.editForm.role
          ).then(res => {
            this.dialogEditVisible = false
            this.$message.success('更新成功')
            this.getList()
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 触发移除
    handleRemove (row) {
      this.$confirm(`您确定要从组织内移除用户【${row.realname}】吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        orgMemberRemove(this.orgId, row.uid).then(res => {
          this.$message.success('移除成功')
          // 移除数据
          this.tableData.forEach((item, index) => {
            if (item.uid == row.uid) {
              this.tableData.splice(index, 1)
            }
          })
        }).finally(() => {
          loading.close()
        })
      })
    },
    // 多选事件监听
    handleTableSelect (rows) {
      this.tableSelectRows = rows
      rows.forEach(row => {
        if (row.role == this.ROLE_MANAGER) {
          this.$message.warning('管理员无法批量编辑或移除')
        }
      })
    },
    // 触发批量编辑
    handleBatchEdit () {
      if (this.tableSelectRows.length == 0) {
        return this.$message.error('请选择要批量编辑的对象')
      }
      for (const row of this.tableSelectRows) {
        if (row.role == this.ROLE_MANAGER) {
          return this.$message.error('管理员无法批量编辑')
        }
      }

      this.batchEditForm = {
        role: null,
        rows: this.tableSelectRows
      }
      this.dialogBatchEditVisible = true
    },
    // 提交批量更新
    submitBatchUpdate () {
      // 表单校验
      this.$refs['batch-edit-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          orgMemberBatchRole(
            this.orgId,
            this.batchEditForm.rows.map(row => row.uid),
            this.batchEditForm.role
          ).then(res => {
            this.dialogBatchEditVisible = false
            this.$message.success('更新成功')
            this.getList()
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    // 批量移除成员
    handleBatchRemove () {
      if (this.tableSelectRows.length == 0) {
        return this.$message.error('请选择要批量移除的对象')
      }
      for (const row of this.tableSelectRows) {
        if (row.role == this.ROLE_MANAGER) {
          return this.$message.error('管理员无法批量移除')
        }
      }

      const users = this.tableSelectRows.map(row => row.realname).join('、')

      this.$confirm(`您确定要从组织内移除用户【${users}】吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        orgMemberBatchRemove(this.orgId, this.tableSelectRows.map(row => row.uid)).then(res => {
          this.$message.success('移除成功')
          this.getList()
        }).finally(() => {
          loading.close()
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  padding-bottom: 100px;
  .table-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    .table-tools-left {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .table-tools-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex: 1;
      min-width: 0;
      .table-tools-filter {
        width: 160px;
        flex: 0 0 160px;
      }
      .table-tools-input-keyword {
        width: min(360px, 100%);
        flex: 0 1 360px;
      }
    }
  }
}

.account-avatar {
  float: left;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  vertical-align: middle;
}
.account-nickname {
  margin-left: 10px;
}
.account-email {
  float: right;
  color: #909399;
  font-size: 12px;
}

.invite-form {
  .invite-form-item-control {
    width: 420px;
  }
}

@media (max-width: 1100px) {
  .project-main .table-tools .table-tools-right {
    width: 100%;
    justify-content: flex-start;
    flex: 1 0 100%;
  }
}
</style>
