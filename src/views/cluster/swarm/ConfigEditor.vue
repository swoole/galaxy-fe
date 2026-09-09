<template>
  <el-drawer
    :with-header="false"
    :visible.sync="visible"
    :close-on-press-escape="false"
    :wrapperClosable="false"
    size="760px">
    <div class="config-editor" v-loading="loading">
      <easy-title title="修改 Service Config" margin-set="0 20" />

      <el-form v-if="!editing" size="small">
        <el-form-item label="Service">
          <el-input :value="serviceName" class="form-control" disabled />
        </el-form-item>
        <el-form-item label="配置文件">
          <el-radio-group v-model="selectedIndex" class="config-list">
            <el-radio-button v-for="(cfg, idx) in configs" :key="idx" :label="idx">
              {{ cfg.target }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <div class="operators">
          <el-button type="primary" @click="startEdit" :disabled="configs.length === 0">编辑</el-button>
          <el-button @click="close">取消</el-button>
        </div>
      </el-form>

      <div v-else>
        <div class="editor-header">
          <span class="editor-target">{{ currentConfig.target }}</span>
        </div>
        <el-input
          ref="editor"
          v-model="editContent"
          type="textarea"
          :rows="22"
          class="yaml-editor"
          placeholder="输入配置内容..." />
        <div class="operators">
          <el-button type="primary" :loading="saving" @click="save">保存并重启</el-button>
          <el-button @click="cancelEdit">返回</el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import { clusterSwarmServiceConfig, clusterSwarmServiceConfigUpdate } from '@/api/cluster'

export default {
  name: 'SwarmConfigEditor',
  components: { EasyTitle },
  props: {
    orgId: { type: [Number, String], required: true },
    clusterId: { type: Number, required: true },
    scope: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      visible: false,
      loading: false,
      saving: false,
      editing: false,
      serviceId: '',
      serviceName: '',
      configs: [],
      selectedIndex: 0,
      editContent: ''
    }
  },
  computed: {
    currentConfig () {
      return this.configs[this.selectedIndex] || {}
    }
  },
  methods: {
    open (row) {
      this.serviceId = row.id
      this.serviceName = row.name
      this.configs = []
      this.selectedIndex = 0
      this.editing = false
      this.visible = true
      this.loadConfigs()
    },
    close () {
      this.visible = false
    },
    loadConfigs () {
      this.loading = true
      clusterSwarmServiceConfig(this.orgId, this.clusterId, this.serviceId, this.scope).then(res => {
        this.configs = res.data.configs || []
      }).catch(err => {
        this.$message.error(err.response?.data?.message || '获取配置失败')
      }).finally(() => {
        this.loading = false
      })
    },
    startEdit () {
      this.editContent = this.currentConfig.content || ''
      this.editing = true
    },
    cancelEdit () {
      this.editing = false
    },
    save () {
      this.saving = true
      clusterSwarmServiceConfigUpdate(
        this.orgId, this.clusterId, this.serviceId,
        this.currentConfig.config_id, this.editContent, this.scope
      ).then(() => {
        this.$message.success('配置已更新，Service 正在重启')
        this.editing = false
        this.loadConfigs()
        this.$emit('done')
      }).catch(err => {
        this.$message.error(err.response?.data?.message || '更新配置失败')
      }).finally(() => {
        this.saving = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.config-editor {
  padding: 30px;
}
.form-control {
  width: 500px;
}
.config-list {
  display: flex;
  flex-direction: column;
  ::v-deep .el-radio-button {
    margin-bottom: 4px;
  }
  ::v-deep .el-radio-button__inner {
    width: 500px;
    text-align: left;
    font-family: monospace;
    font-size: 13px;
  }
}
.editor-header {
  margin-bottom: 12px;
}
.editor-target {
  font-family: monospace;
  font-size: 13px;
  color: #409eff;
}
.yaml-editor {
  ::v-deep textarea {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
  }
}
.operators {
  margin-top: 16px;
  padding-left: 0;
}
</style>
