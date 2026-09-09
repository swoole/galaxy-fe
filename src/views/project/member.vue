<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" :project="project" />

    <div class="project-main">
      <div class="table-tools">
        <div class="table-tools-left">
          <template v-if="$p('project.member.w', project.org_role, project.group_role, project.role)">
            <el-button type="primary" size="small" @click="handleAdd">添加成员</el-button>
            <el-button type="primary" size="small" @click="handleBatchEdit">批量编辑</el-button>
            <el-button type="warning" size="small" @click="handleBatchRemove">批量移除</el-button>
          </template>
        </div>
        <div class="table-tools-right">
          <el-select
            v-model="filterForm.role"
            class="table-tools-filter"
            size="small"
            clearable
            placeholder="角色筛选">
            <el-option
              v-for="(role, roleId) in ROLES_WITH_DIRECTOR"
              :key="roleId"
              :label="role.label"
              :value="Number(roleId)">
            </el-option>
          </el-select>
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入姓名、邮箱进行搜索"
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
            {{ row.email }}
          </template>
        </el-table-column>

        <el-table-column
          label="角色"
          prop="role"
          align="center"
        >
          <template #default="{ row }">
            <project-member-role :role="row.role"></project-member-role>
          </template>
        </el-table-column>

        <el-table-column
          label="加入时间"
          prop="tag"
          align="center"
        >
          <template #default="{ row }">
            {{ row.join_at | formatDate }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          align="center"
        >
          <template #default="{ row }">
            <template v-if="$p('project.member.w', project.org_role, project.group_role, project.role)">
              <el-link type="primary" @click="handleEdit(row)">编辑</el-link>
              <el-divider direction="vertical"></el-divider>
              <el-link :disabled="row.role == ROLE_DIRECTOR" type="warning" @click="handleRemove(row)">移除</el-link>
            </template>
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
    <el-dialog title="添加成员" :visible.sync="dialogAddVisible" :close-on-click-modal="false">
      <el-form
        :model="addForm"
        class="add-form"
        label-width="120px"
        ref="add-form"
        :rules="addFormRules"
        @submit.native.prevent="submitAdd"
      >
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="addForm.role"
            class="add-form-item-control"
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
        <el-form-item label="用户" prop="uid">
          <el-select
            v-model="addForm.uid"
            class="add-form-item-control"
            clearable
            filterable
            remote
            :loading="addloading"
            :remote-method="filterSearchUsers"
            placeholder="请输入姓名或邮箱搜索"
            aria-autocomplete="off"
            autocomplete="off">
            <el-option
              v-for="user in searchUsers"
              :key="user.uid"
              :label="user.realname"
              :value="Number(user.id)">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogAddVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">确定</el-button>
      </div>
    </el-dialog>

    <!-- 编辑成员角色 -->
    <el-dialog title="编辑成员" :visible.sync="dialogEditVisible" :close-on-click-modal="false">
      <el-form
        :model="editForm"
        label-width="120px"
        ref="edit-form"
        :rules="editFormRules"
        @submit.native.prevent="submitUpdate"
      >
        <el-form-item v-if="editForm.role == ROLE_DIRECTOR" label="角色" prop="role">
          <el-select
            v-model="editForm.role"
            disabled
            placeholder="请选择">
            <el-option
              v-for="(role, roleId) in ROLES_WITH_DIRECTOR"
              :key="roleId"
              :label="role.label"
              :value="Number(roleId)">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-else label="角色" prop="role">
          <el-select
            v-model="editForm.role"
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
import Breadcrumb from '@/views/project/components/Breadcrumb'
import EasyTitle from '../components/EasyTitle'
import OrgUser from '../components/OrgUser'
import {
  ROLES,
  ROLES_WITH_DIRECTOR,
  ROLE_DIRECTOR
} from '@/consts/project'
import { projectMember, projectMemberSearchFromGroup, projectMemberCreate, projectMemberRemove, projectMemberRoleUpdate, projectMemberBatchRemove, projectMemberRoleBatchUpdate } from '@/api/project'
import { formatDate } from '@/utils/filters'
import { formatInArrayNumber, routeBreadcrumb } from '@/utils/helpers'
import ProjectMemberRole from '../components/ProjectMemberRole'
import Pagination from '@/components/Pagination'

export default {
  name: 'ProjectMember',
  components: {
    Breadcrumb,
    EasyTitle,
    OrgUser,
    Pagination,
    ProjectMemberRole
  },
  props: {
    project: {
      type: Object,
      default: null
    },
    projectId: {
      type: [Number, String],
      required: true
    },
    groupId: {
      type: [Number, String],
      required: true
    },
    orgId: {
      type: [Number, String],
      required: true
    }
  },
  filters: {
    formatDate
  },
  data () {
    return {
      // 筛选表单
      filterForm: {
        role: null,
        keyword: null
      },
      ROLES,
      ROLES_WITH_DIRECTOR,
      ROLE_DIRECTOR,
      tableData: [],
      tableSelectRows: [],
      tableLoading: false,
      page: 1,
      pageSize: 20,
      total: 0,
      // 添加成员对话框显示
      dialogAddVisible: false,
      addForm: {
        role: null,
        uid: null
      },
      addloading: false,
      searchUsers: [],
      addFormRules: {
        role: [
          { required: true, message: '请选择角色', trigger: 'blur' }
        ],
        uid: [
          { required: true, message: '请选择用户', trigger: 'blur' }
        ]
      },
      // 编辑成员对话框显示
      dialogEditVisible: false,
      editForm: {
        uid: null,
        role: null
      },
      editFormRules: {
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
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: '项目信息', to: '' },
        { title: this.$route.meta.title, to: '' }
      ]
    }
  },
  created () {
    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      projectMember(
        this.orgId,
        this.groupId,
        this.projectId,
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
    // 多选事件监听
    handleTableSelect (rows) {
      this.tableSelectRows = rows
      rows.forEach(row => {
        if (row.role == this.ROLE_DIRECTOR) {
          this.$message.warning('负责人无法批量编辑或移除')
        }
      })
    },
    filterSearchUsers (query) {
      if (query !== '') {
        this.addloading = true
        projectMemberSearchFromGroup(
          this.orgId,
          this.groupId,
          null,
          query
        ).then(res => {
          this.searchUsers = formatInArrayNumber(res.data.members, ['id', 'role'])
        }).finally(() => {
          this.addloading = false
        })
      }
    },
    // 触发添加
    handleAdd () {
      this.addForm = {
        role: null,
        uid: null
      }
      this.dialogAddVisible = true
    },
    // 提交邀请
    submitAdd () {
      // 表单校验
      this.$refs['add-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          projectMemberCreate(
            this.orgId,
            this.groupId,
            this.projectId,
            this.addForm.uid,
            this.addForm.role
          ).then(res => {
            this.dialogAddVisible = false
            this.$message.success('添加成功')
            this.getList()
          }).finally(() => {
            loading.close()
            this.dialogAddVisible = false
          })
        }
      })
    },
    // 触发批量编辑
    handleBatchEdit () {
      if (this.tableSelectRows.length == 0) {
        return this.$message.error('请选择要批量编辑的对象')
      }
      for (const row of this.tableSelectRows) {
        if (row.role == this.ROLE_DIRECTOR) {
          return this.$message.error('负责人无法批量编辑')
        }
      }

      this.batchEditForm = {
        role: null,
        tags: [],
        rows: this.tableSelectRows
      }
      this.dialogBatchEditVisible = true
    },
    // 批量移除成员
    handleBatchRemove () {
      if (this.tableSelectRows.length == 0) {
        return this.$message.error('请选择要批量移除的对象')
      }
      for (const row of this.tableSelectRows) {
        if (row.role == this.ROLE_DIRECTOR) {
          return this.$message.error('负责人无法批量移除')
        }
      }

      const users = this.tableSelectRows.map(row => row.realname).join('、')

      this.$confirm(`您确定要从项目成员中移除用户【${users}】吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        projectMemberBatchRemove(
          this.orgId,
          this.groupId,
          this.projectId,
          this.tableSelectRows.map(row => row.uid)
        ).then(res => {
          this.$message.success('移除成功')
          this.getList()
        }).finally(() => {
          loading.close()
        })
      })
    },
    // 触发编辑
    handleEdit (row) {
      this.editForm = {
        uid: row.uid,
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
          projectMemberRoleUpdate(
            this.orgId,
            this.groupId,
            this.projectId,
            this.editForm.uid,
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
      this.$confirm(`您确定要从项目成员中移除用户【${row.realname}】吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loading = this.$loading()
        projectMemberRemove(
          this.orgId,
          this.groupId,
          this.projectId,
          row.uid
        ).then(res => {
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
    // 提交批量更新
    submitBatchUpdate () {
      // 表单校验
      this.$refs['batch-edit-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          projectMemberRoleBatchUpdate(
            this.orgId,
            this.groupId,
            this.projectId,
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
    }
  }
}
</script>

<style lang="scss" scoped>
.project-main {
  padding-bottom: 100px;
  .member-tag {
    &:not(:first-child) {
      margin-left: 5px;
    }
  }
  .table-tools {
    position: relative;
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
</style>
