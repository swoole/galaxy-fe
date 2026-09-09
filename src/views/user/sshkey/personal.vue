<template>
  <div class="ssh-key-personal">
    <div class="desc-normal" style="margin-bottom: 20px;">
      授权公钥用于登录原生 SSH 终端等场景。这里只保存您自行生成并上传的公钥，不包含私钥。
    </div>

    <div class="table-tools">
      <div class="table-tools-left">
        <el-button type="primary" size="mini" @click="handleCreate">新建公钥</el-button>
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
        label="指纹"
        prop="fingerprint"
        width="450"
      >
      </el-table-column>
      <el-table-column
        label="备注"
        prop="remark"
        show-overflow-tooltip
      >
      </el-table-column>
      <el-table-column
        label="创建时间"
        prop="created_at"
        width="180"
        align="center"
      >
        <template #default="{ row }">
          {{ row.created_at | formatDate }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        align="center"
        width="80"
      >
        <template #default="{ row }">
          <el-link :disabled="row.used" type="danger" @click="handleDelete(row)">删除</el-link>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建SSH公钥 -->
    <el-dialog title="新建SSH公钥" :visible.sync="dialogCreateVisible" :close-on-click-modal="false">
      <el-form
        :model="createForm"
        class="dialog-form"
        label-width="120px"
        ref="create-form"
        :rules="createFormRules"
        size="small"
        @submit.native.prevent="submitCreate"
      >
        <el-form-item label="公钥" prop="pubkey">
          <el-input
            v-model="createForm.pubkey"
            :autosize="{ minRows: 5, maxRows: 10 }"
            type="textarea"
            class="dialog-form-item-control"
            placeholder="生成密钥 `ssh-keygen -t rsa -b 2048 -C '<comment>'` 或使用现有密钥 `cat ~/.ssh/id_rsa.pub`"
            spellcheck="false" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="createForm.remark"
            :maxlength="200"
            show-word-limit
            :rows="4"
            type="textarea"
            class="dialog-form-item-control"
            placeholder="备注" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogCreateVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  userPersonalSshkeys,
  userPersonalSshkeyCreate,
  userPersonalSshkeyDelete
} from '@/api/user'
import { formatDate } from '@/utils/filters'

export default {
  name: 'UserSshKeyPersonal',
  filters: {
    formatDate
  },
  data () {
    return {
      tableData: [],
      tableLoading: false,
      createForm: {
        pubkey: null,
        remark: null
      },
      createFormRules: {
        remark: [
          { max: 200, message: '备注不能超过200个字符串长度', trigger: 'blur' }
        ],
        pubkey: [
          { required: true, message: '请填写公钥', trigger: 'blur' }
        ]
      },
      dialogCreateVisible: false
    }
  },
  created () {
    this.getList()
  },
  methods: {
    getList () {
      this.tableLoading = true
      userPersonalSshkeys().then(res => {
        this.tableData = res.data.keys
      }).finally(() => {
        this.tableLoading = false
      })
    },
    handleCreate () {
      this.createForm = {
        pubkey: null,
        remark: null
      }
      this.dialogCreateVisible = true
    },
    submitCreate () {
      this.$refs['create-form'].validate((valid) => {
        if (valid) {
          const loading = this.$loading()
          userPersonalSshkeyCreate(
            this.createForm.pubkey,
            this.createForm.remark
          ).then(res => {
            this.$message.success('创建成功')
            this.dialogCreateVisible = false

            this.tableData.unshift(res.data.key)
          }).finally(() => {
            loading.close()
          })
        }
      })
    },
    handleDelete (row) {
      this.$confirm(`您确定要删除此密钥吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        userPersonalSshkeyDelete(row.id)
          .then(res => {
            this.$message.success('删除成功')
            this.tableData.forEach((item, index) => {
              if (item.id == row.id) {
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
.dialog-form {
  .dialog-form-item-control {
    width: 420px;
  }
}
</style>
