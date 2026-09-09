<template>
  <div class="project-container">
    <breadcrumb :breadcrumb="breadcrumb" />

    <div class="project-main">
    </div>
  </div>
</template>

<script>
import EasyTitle from '../../components/EasyTitle'
import { formatDate } from '@/utils/filters'
import Breadcrumb from '../../components/Breadcrumb'
import OrgUser from '../../components/OrgUser'
import { routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'OrgProfile',
  components: {
    EasyTitle,
    Breadcrumb,
    OrgUser
  },
  filters: {
    formatDate,
    OrgUser
  },
  data () {
    return {
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
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
  },
  methods: {
  }
}
</script>

<style lang="scss" scoped>
.project-main {

}
</style>
