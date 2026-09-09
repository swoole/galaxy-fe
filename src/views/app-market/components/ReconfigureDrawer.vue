<template>
  <el-drawer
    :with-header="false"
    :visible.sync="visible"
    :close-on-press-escape="false"
    :wrapperClosable="false"
    size="600px">
    <div class="reconfigure-drawer">
      <easy-title title="修改配置" margin-set="0 20" />

      <el-form
        ref="form"
        :model="form"
        label-width="140px"
        size="small">
        <el-form-item label="应用标题">
          <el-input v-model="title" class="form-control" disabled />
        </el-form-item>
        <el-form-item label="Service 名称">
          <el-input v-model="serviceName" class="form-control" disabled />
        </el-form-item>

        <el-divider content-position="left">应用配置</el-divider>

        <el-form-item
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :prop="`values.${field.key}`"
          :rules="field.required ? [{ required: true, message: `请填写${field.label}`, trigger: 'blur' }] : []">
          <el-input-number
            v-if="field.type == 'number'"
            v-model="form[field.key]"
            :min="field.min || 1"
            :max="field.max || 65535"
            controls-position="right"
            class="form-control" />
          <el-input
            v-else-if="field.type == 'textarea'"
            v-model="form[field.key]"
            type="textarea"
            :rows="10"
            class="form-control"
            :placeholder="field.placeholder || ''" />
          <el-input
            v-else-if="field.type == 'secret'"
            v-model="form[field.key]"
            show-password
            type="password"
            class="form-control"
            :placeholder="field.placeholder || ''" />
          <el-input
            v-else
            v-model="form[field.key]"
            class="form-control"
            :placeholder="field.placeholder || ''" />
        </el-form-item>

        <div class="operators">
          <el-button type="primary" :loading="submitting" @click="submit">保存修改</el-button>
          <el-button @click="close">取消</el-button>
        </div>
      </el-form>
    </div>
  </el-drawer>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import { appMarketReconfigure } from '@/api/app'

export default {
  name: 'AppMarketReconfigureDrawer',
  components: {
    EasyTitle
  },
  props: {
    orgId: {
      type: [Number, String],
      required: true
    }
  },
  data () {
    return {
      visible: false,
      submitting: false,
      installationId: null,
      title: '',
      serviceName: '',
      configSchema: {},
      form: {}
    }
  },
  computed: {
    fields () {
      return Object.keys(this.configSchema)
        .filter(key => (this.configSchema[key].type || '') !== 'secret')
        .map(key => Object.assign({ key }, this.configSchema[key]))
    }
  },
  methods: {
    open (installation) {
      this.installationId = installation.id
      this.title = installation.title
      this.serviceName = installation.service_name
      this.configSchema = installation.config_schema || {}
      this.form = JSON.parse(JSON.stringify(installation.config_values || {}))
      this.visible = true
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    close () {
      this.visible = false
    },
    submit () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.submitting = true
        appMarketReconfigure(this.orgId, this.installationId, this.form).then(() => {
          this.$message.success('配置已更新，Service 正在重启')
          this.visible = false
          this.$emit('done')
        }).catch(err => {
          this.$message.error(err.response?.data?.message || err.message || '修改配置失败')
        }).finally(() => {
          this.submitting = false
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.reconfigure-drawer {
  padding: 30px;
}
.form-control {
  width: 420px;
}
.operators {
  margin-top: 24px;
  padding-left: 140px;
}
</style>
