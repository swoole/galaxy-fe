<template>
  <span v-if="template" class="technology-badges">
    <span v-for="badge in badges" :key="badge.name" class="technology-badge">
      <span class="badge-name">{{ badge.name }}</span><span v-if="badge.version" class="badge-version">{{ badge.version }}</span>
    </span>
  </span>
</template>

<script>
export default {
  name: 'TechnologyBadges',
  props: { template: { type: Object, default: null } },
  computed: {
    badges () {
      if (!this.template) return []
      return [
        { name: this.languageLabel(this.template.language), version: this.template.runtime_version },
        { name: this.frameworkLabel(this.template.framework), version: this.template.framework_version === 'any' ? '' : this.template.framework_version }
      ].filter(item => item.name)
    }
  },
  methods: {
    languageLabel (value) { return ({ php: 'PHP', node: 'Node.js', python: 'Python', java: 'Java', go: 'Go', static: 'Static' })[value] || value },
    frameworkLabel (value) { return ({ laravel: 'Laravel', hyperf: 'Hyperf', symfony: 'Symfony', thinkphp: 'ThinkPHP', nestjs: 'NestJS', nextjs: 'Next.js', nuxt: 'Nuxt', fastapi: 'FastAPI', 'spring-boot': 'Spring Boot', generic: '通用' })[value] || value }
  }
}
</script>

<style lang="scss" scoped>
.technology-badges { display: flex; flex-wrap: wrap; gap: 7px; }
.technology-badge { display: inline-flex; overflow: hidden; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(27, 31, 36, .08); color: #fff; font-size: 11px; font-weight: 600; line-height: 20px; white-space: nowrap; }
.badge-name { padding: 0 7px; background: #555d68; }
.badge-version { padding: 0 7px; background: #1683d8; }
</style>
