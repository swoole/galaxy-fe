<template>
  <div class="step-install-progress">
    <el-timeline>
      <el-timeline-item
        v-for="(progress, index) in progresses"
        :key="index"
        :icon="levels[progress.level].icon"
        :type="levels[progress.level].type"
        :color="levels[progress.level].color"
        size="large"
        :timestamp="parseInt(progress.report_at) | formatDate">
        <template v-if="progress.tag == 'finish'">
          <div>应用安装成功<span v-if="progress.context && progress.context.cost">，耗时{{ Math.round(progress.context.cost) | formatTimeDiff }}</span></div>
          <el-descriptions
            v-if="progress.context && progress.context.bootstrap_password"
            class="install-result"
            :column="1"
            size="small"
            border>
            <el-descriptions-item label="访问域名">{{ progress.context.hostname }}</el-descriptions-item>
            <el-descriptions-item label="初始用户名">{{ progress.context.username }}</el-descriptions-item>
            <el-descriptions-item label="初始密码">
              <code>{{ progress.context.bootstrap_password }}</code>
              <el-button
                type="text"
                size="mini"
                class="copy-button"
                @click="copy(progress.context.bootstrap_password)">复制</el-button>
            </el-descriptions-item>
          </el-descriptions>
        </template>
        <template v-else-if="progress.tag == 'error'">
          <pre class="text-danger word-wrap">{{ progress.msg }}</pre>
        </template>
        <template v-else>
          {{ progress.msg }}
          <code v-if="progress.tag === 'queued'">jobId: {{ jobId }}</code>
        </template>
      </el-timeline-item>
    </el-timeline>

    <div v-if="installStatus == 'installing'" class="installing-tips">
      <i class="el-icon-loading"></i>
      <span class="installing-tips-text">
        应用正在安装中，已等待 {{ elapsedSeconds | formatTimeDiff }}，最长约
        {{ installTimeoutSeconds | formatTimeDiff }}。超时后将自动检查 Kubernetes Events 并显示失败原因。
      </span>
    </div>

    <div v-if="installStatus != 'installing'" class="installed-btns">
      <el-button size="mini" @click="handleCancel">关闭</el-button>
      <el-button v-if="installStatus == 'error'" size="mini" type="primary" @click="handleBack">返回修改</el-button>
      <el-button v-if="installStatus == 'finish'" size="mini" type="warning" @click="handleReset">再次安装</el-button>
    </div>

  </div>
</template>

<script>
import { formatDate } from '@/utils/filters'
import { formatTimeDiff } from '@/utils/helpers'
import { appMarketQueryProgress } from '@/api/app'

export default {
  name: 'AppMarketStepInstallProgress',
  components: {},
  props: {
    mainForm: {
      type: Object,
      required: true
    },
    orgId: {
      type: [Number, String],
      required: true
    },
    profile: {
      type: Object,
      required: true
    },
    jobId: {
      type: String,
      default: null
    }
  },
  filters: {
    formatDate,
    formatTimeDiff
  },
  data () {
    return {
      levels: {
        success: {
          color: '#67C23A',
          icon: 'el-icon-success',
          type: 'success'
        },
        info: {
          color: '#909399',
          icon: 'el-icon-info',
          type: 'info'
        },
        error: {
          color: '#F56C6C',
          icon: 'el-icon-error',
          type: 'danger'
        },
        warning: {
          color: '#E6A23C',
          icon: 'el-icon-warning',
          type: 'warning'
        }
      },
      installStatus: 'installing',
      begin: 0.0,
      progresses: [],
      queryTimer: null,
      elapsedTimer: null,
      startedAt: Date.now(),
      elapsedSeconds: 0
    }
  },
  computed: {
    installTimeoutSeconds () {
      const kubernetes = this.profile && this.profile.kubernetes_install
      return Math.max(60, parseInt(kubernetes && kubernetes.timeout_seconds, 10) || 600)
    }
  },
  mounted () {
    this.elapsedTimer = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000)
    }, 1000)
    this.queryProgress()
  },
  beforeDestroy () {
    if (this.queryTimer) clearTimeout(this.queryTimer)
    if (this.elapsedTimer) clearInterval(this.elapsedTimer)
  },
  methods: {
    // 查询进度
    queryProgress () {
      if (this.elapsedSeconds > this.installTimeoutSeconds + 180) {
        this.installStatus = 'error'
        this.progresses.push({
          tag: 'error',
          level: 'error',
          report_at: Date.now() / 1000,
          msg: `安装任务超过 ${this.installTimeoutSeconds + 180} 秒仍未返回结果，请检查管理中心任务进程和 Kubernetes Events。`
        })
        return
      }
      appMarketQueryProgress(this.orgId, this.jobId, this.begin).then(res => {
        if (res.data.progresses.length > 0) {
          const progresses = res.data.progresses.sort((a, b) => a.report_at - b.report_at)
          const last = progresses[progresses.length - 1]
          this.begin = last.report_at
          progresses.forEach(progress => this.progresses.push(progress))

          // 轮询结束条件
          if (last.tag == 'finish' || last.tag == 'error') {
            this.installStatus = last.tag
            return null
          }
        }

        // 不停轮询自身实现进度查询
        this.queryTimer = setTimeout(this.queryProgress, 1000)
      }).catch(() => {
        this.queryTimer = setTimeout(this.queryProgress, 2000)
      })
    },
    // 触发下一步
    handleStepNext () {
      this.$refs['main-form'].validate((valid) => {
        if (valid) {
          this.$emit('step:next')
        }
      })
    },
    // 触发取消
    handleCancel () {
      this.$emit('cancel')
    },
    // 触发上一步
    handleStepPrev () {
      this.$emit('step:prev')
    },
    // 返回修改（保留表单数据）
    handleBack () {
      this.$emit('back')
    },
    // 重新安装
    handleReset () {
      this.$confirm(`您确定要再次安装当前应用？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$emit('reset')
      })
    },
    copy (value) {
      navigator.clipboard.writeText(value).then(() => {
        this.$message.success('已复制')
      }).catch(() => {
        this.$message.warning('复制失败，请手动复制')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.installing-tips {
  margin-left: 35px;
  color: #E6A23C;
  font-size: 14px;
  .installing-tips-text {
    margin-left: 15px;
  }
}
.installed-btns {
  margin-left: 35px;
}
.install-result {
  margin-top: 12px;
  max-width: 620px;
}
.copy-button {
  margin-left: 10px;
}
</style>
