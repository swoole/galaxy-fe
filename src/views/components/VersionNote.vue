<template>
  <span class="version-note">
    <span v-if="showBranch" class="version-note-branch">
      {{ showBranch }}
    </span>
    <span class="version-note-commitid">
      {{ showCommitID }}
    </span>
  </span>
</template>

<script>
export default {
  name: 'VersionNote',
  props: {
    branch: {
      type: String,
      default: ''
    },
    commitid: {
      type: String,
      default: ''
    }
  },
  computed: {
    showBranch () {
      if (this.branch && this.commitid) {
        return this.branch
      }

      // 约定为tag格式的场景
      return 'tag'
    },
    showCommitID () {
      // 约定为tag格式的场景
      if (this.branch && !this.commitid) {
        return this.branch
      }

      return this.commitid.substr(0, 7)
    }
  }
}
</script>

<style lang="scss" scoped>
.version-note {
  color: #fff;
  line-height: 20px;
  font-size: 12px;
  .version-note-branch {
    display: inline-block;
    background: #4B4B4B;
    padding: 0 5px;
    border-radius: 4px 0 0 4px;
    & + .version-note-commitid {
      border-radius: 0 4px 4px 0;
    }
  }
  .version-note-commitid {
    display: inline-block;
    background: #59C52D;
    padding: 0 5px;
    border-radius: 4px;
  }
}
</style>
