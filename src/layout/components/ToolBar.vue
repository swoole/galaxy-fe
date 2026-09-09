<template>
  <div v-if="!hidden" class="tool-bar">
    <div
      class="tool-bar-item tool-bar-chat"
      :class="{ 'tool-bar-chat-active': chatActive }"
      @mouseenter="chatActive = true"
      @mouseleave="chatActive = false">
      <i v-show="!chatActive" class="el-icon-chat-dot-round"></i>
      <span v-show="chatActive" class="tool-bar-chat-text">咨询客服</span>

      <el-collapse-transition>
        <div v-show="chatActive" class="tool-bar-chat-detail">
          <el-popconfirm
            class="tool-bar-chat-detail-close"
            confirm-button-text="确认隐藏"
            cancel-button-text="不用了"
            icon="el-icon-info"
            icon-color="red"
            title="您确认要隐藏悬浮工具吗？"
            @confirm="handleCloseConfirm"
            @cancel="handleCloseCancel"
          >
            <span class="tool-bar-chat-detail-close-btn" title="隐藏悬浮工具" slot="reference">
              <i class="el-icon-close"></i>
            </span>
          </el-popconfirm>
          <div class="tool-bar-chat-detail-title" style="margin-top: 15px;">联系电话：</div>
          <div class="tool-bar-chat-detail-cnt">18015448127</div>
          <div class="tool-bar-chat-detail-divider"></div>
          <div class="tool-bar-chat-detail-title">微信咨询：</div>
          <div class="tool-bar-chat-detail-cnt">
            <img class="tool-bar-chat-detail-qrcode" src="@/assets/img/weixin.png" alt="识沃科技">
          </div>
          <div class="tool-bar-chat-detail-divider"></div>
          <div class="tool-bar-chat-detail-title">工作时间：</div>
          <div class="tool-bar-chat-detail-cnt" style="margin-bottom: 15px;">
            <span style="font-size: 14px">10:00 ~ 19:00</span>
            <span style="font-size: 12px">（工作日）</span>
          </div>
        </div>
      </el-collapse-transition>
    </div>
  </div>
</template>

<script>
import Cookies from 'js-cookie'

export default {
  name: 'ToolBar',
  data () {
    return {
      hidden: true,
      chatActive: false,
      storageKey: 'cg.hidden.toolbar'
    }
  },
  created () {
    if (!Cookies.get(this.storageKey)) {
      this.hidden = false
    }
  },
  methods: {
    handleCloseConfirm () {
      this.$notify({
        title: '操作成功',
        message: '您已隐藏悬浮工具，若需要显示需要重新打开浏览器',
        type: 'success'
      })
      Cookies.set(this.storageKey, Date.now())
      this.hidden = true
    },
    handleCloseCancel () {
      // do nothing
    }
  }
}
</script>

<style scoped>
.tool-bar {
  position: fixed;
  right: 0;
  top: 40%;
  z-index: 999;
}
.tool-bar-item {
  width: 48px;
  box-shadow: 0 10px 20px rgb(0 0 0 / 10%);
  background: rgba(255,255,255,0.8);
  border-radius: 4px 0 0 4px;
}
.tool-bar-chat {
  cursor: pointer;
  position: relative;
  text-align: center;
}
.tool-bar-chat .el-icon-chat-dot-round {
  color: #3d98ff;
  font-size: 36px;
  line-height: 48px;
}
.tool-bar-chat-active {
  background: #3d98ff;
  color: #fff;
  font-size: 16px;
  line-height: 20px;
  padding: 4px 2px;
  border-radius: 0;
}
.tool-bar-chat-detail {
  position: absolute;
  right: 48px;
  top: 0;
  background: #3d98ff;
  color: #fff;
  text-align: left;
  padding: 0 15px;
  line-height: normal;
}
.tool-bar-chat-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255, 0.8);
  margin-bottom: 4px;
}
.tool-bar-chat-detail-cnt {
  font-size: 16px;
}
.tool-bar-chat-detail-qrcode {
  width: 150px;
  height: 150px;
}
.tool-bar-chat-detail-divider {
  width: 100%;
  height: 0px;
  border-bottom: 2px dashed rgba(255,255,255, 0.4);
  margin: 10px 0;
}
.tool-bar-chat-detail-close-btn {
  position: absolute;
  right: 5px;
  top: 5px;
  font-size: 14px;
  padding: 5px 8px;
}
</style>
