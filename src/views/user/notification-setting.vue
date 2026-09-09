<template>
  <div class="user-main box-shadow">
    <easy-title title="通知设置" margin-set="0 20" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="通知渠道" name="channels">
        <el-table
          style="width: 100%; "
          :data="channels"
          v-loading="channelsTableLoading"
          fit
          highlight-current-row
        >
          <el-table-column
            label="渠道"
            prop="channel_text"
            width="150"
          >
            <template #default="{ row }">
              {{ row.channel_text }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
          >
            <template #default="{ row }">
              <template v-if="row.status === false">
                <el-tag size="mini" type="danger">未启用</el-tag>
              </template>
              <template v-else-if="row.status === true">
                <el-tag size="mini" type="success">已启用</el-tag>
              </template>
              <template v-else>
                <el-tag size="mini" type="success">已启用</el-tag> {{ row.status }}
              </template>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            align="center"
            width="200"
          >
            <template #default="{ row }">
              <template v-if="row.channel == NOTIFY_CHANNEL_EMAIL">
                <router-link :to="{ name: 'UserAccountBindEmail' }" custom v-slot="{ href }">
                  <el-link :href="href" target="_blank" type="primary">
                    {{ row.status ? '修改' : '去绑定' }}
                  </el-link>
                </router-link>
              </template>
              <template v-else-if="row.channel == NOTIFY_CHANNEL_BROWSER">
                <template v-if="row.status === false">
                  <el-link type="primary" @click="handleEnableBrowser">启用</el-link>
                </template>
              </template>
              <template v-else-if="row.channel == NOTIFY_CHANNEL_NOTIFY">
                <router-link :to="{ name: 'UserNotification' }" custom v-slot="{ href }">
                  <el-link :href="href" target="_blank" type="primary">
                    消息列表
                  </el-link>
                </router-link>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

  </div>
</template>

<script>
import EasyTitle from '@/views/components/EasyTitle'
import { notifyChannels } from '@/api/user'
import {
  NOTIFY_CHANNEL_EMAIL,
  NOTIFY_CHANNEL_NOTIFY,
  NOTIFY_CHANNEL_BROWSER,
  NOTIFY_CHANNELS
} from '@/consts/user'

export default {
  name: 'UserNotificationSetting',
  components: {
    EasyTitle
  },
  data () {
    return {
      activeTab: 'channels',
      channelsMap: {},
      channelsTableLoading: false,
      // 常量定义
      NOTIFY_CHANNEL_EMAIL,
      NOTIFY_CHANNEL_NOTIFY,
      NOTIFY_CHANNEL_BROWSER,
      NOTIFY_CHANNELS
    }
  },
  computed: {
    channels () {
      const channels = []
      for (const channel in this.channelsMap) {
        if (![NOTIFY_CHANNEL_EMAIL, NOTIFY_CHANNEL_NOTIFY, NOTIFY_CHANNEL_BROWSER].includes(channel)) continue
        channels.push({
          channel,
          channel_text: NOTIFY_CHANNELS[channel] ? NOTIFY_CHANNELS[channel].label : channel,
          status: this.channelsMap[channel]
        })
      }

      return channels
    }
  },
  created () {
    this.loadChannels()
  },
  methods: {
    // 加载通知渠道
    loadChannels () {
      this.channelsTableLoading = true
      notifyChannels().then(res => {
        this.channelsMap = res.data.channels
        this.$set(this.channelsMap, NOTIFY_CHANNEL_BROWSER, window.Notification && Notification.permission == 'granted')
      }).finally(() => {
        this.channelsTableLoading = false
      })
    },
    // 开启浏览器通知
    handleEnableBrowser () {
      if (!window.Notification) {
        return this.$message.error('您的浏览器不支持该功能')
      }

      Notification.requestPermission(status => {
        if (status == 'granted') {
          this.$message.success('您的浏览器已成功开启通知功能')
          this.$set(this.channelsMap, NOTIFY_CHANNEL_BROWSER, true)
        } else if (status == 'denied') {
          this.$message.warning('您已禁用浏览器通知功能，将无法收到浏览器通知')
        }
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
