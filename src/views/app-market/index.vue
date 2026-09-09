<template>
  <div class="app-container app-market">
    <div class="market-layout">
      <!-- 左侧筛选栏 -->
      <aside class="market-sidebar">
        <div class="sidebar-section" v-if="filterMetadata.category && filterMetadata.category.length">
          <h4 class="sidebar-title">分类</h4>
          <ul class="sidebar-list">
            <li
              class="sidebar-item"
              :class="{ active: filterForm.category === null && filterForm.type === null }"
              @click="clearAllFilters">
              <img class="sidebar-item-icon" src="/app-market/icons/all.svg" alt="全部" />
              <span>全部</span>
            </li>
            <li
              v-for="cat in filterMetadata.category"
              :key="cat.id"
              class="sidebar-item"
              :class="{ active: filterForm.category === cat.id }"
              @click="toggleCategory(cat.id)">
              <img class="sidebar-item-icon" :src="categoryIconSrc(cat.title)" :alt="cat.title" />
              <span>{{ cat.title }}</span>
            </li>
          </ul>
        </div>

        <div class="sidebar-section">
          <h4 class="sidebar-title">类型</h4>
          <ul class="sidebar-list">
            <li
              class="sidebar-item"
              :class="{ active: filterForm.type === null }"
              @click="$set(filterForm, 'type', null); handleFilter()">全部</li>
            <li
              v-for="(item, key) in APP_MARKET_TYPES"
              :key="key"
              class="sidebar-item"
              :class="{ active: filterForm.type === Number(key) }"
              @click="$set(filterForm, 'type', Number(key)); handleFilter()">{{ item.label }}</li>
          </ul>
        </div>

        <div class="sidebar-section" v-if="filterMetadata.tag && filterMetadata.tag.length">
          <h4 class="sidebar-title">标签</h4>
          <ul class="sidebar-list">
            <li
              class="sidebar-item"
              :class="{ active: filterForm.tags.length === 0 }"
              @click="$set(filterForm, 'tags', []); handleFilter()">全部</li>
            <li
              v-for="item in filterMetadata.tag"
              :key="item.id"
              class="sidebar-item"
              :class="{ active: filterForm.tags.includes(Number(item.id)) }"
              @click="toggleTag(Number(item.id))">{{ item.title }}</li>
          </ul>
        </div>

        <div class="sidebar-section" v-if="filterMetadata.lang && filterMetadata.lang.length">
          <h4 class="sidebar-title">语言</h4>
          <ul class="sidebar-list">
            <li
              class="sidebar-item"
              :class="{ active: filterForm.lang === null }"
              @click="$set(filterForm, 'lang', null); handleFilter()">全部</li>
            <li
              v-for="item in filterMetadata.lang"
              :key="item.id"
              class="sidebar-item"
              :class="{ active: filterForm.lang === Number(item.id) }"
              @click="$set(filterForm, 'lang', Number(item.id)); handleFilter()">{{ item.title }}</li>
          </ul>
        </div>

        <div class="sidebar-section" v-if="filterMetadata.framework && filterMetadata.framework.length">
          <h4 class="sidebar-title">框架</h4>
          <ul class="sidebar-list">
            <li
              class="sidebar-item"
              :class="{ active: filterForm.framework === null }"
              @click="$set(filterForm, 'framework', null); handleFilter()">全部</li>
            <li
              v-for="item in filterMetadata.framework"
              :key="item.id"
              class="sidebar-item"
              :class="{ active: filterForm.framework === Number(item.id) }"
              @click="$set(filterForm, 'framework', Number(item.id)); handleFilter()">{{ item.title }}</li>
          </ul>
        </div>

        <div class="sidebar-clear" v-if="activeFilterCount">
          <el-button type="text" size="mini" @click="clearAllFilters">
            <i class="el-icon-close" /> 清除全部筛选 ({{ activeFilterCount }})
          </el-button>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="market-main">
        <header class="market-header">
          <h1 class="market-title">应用市场</h1>
          <p class="market-subtitle">发现并一键部署数据库、中间件与框架模板，加速你的应用交付</p>
        </header>

        <!-- 搜索 + 排序栏 -->
        <div class="market-toolbar">
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索应用、中间件、数据库..."
            prefix-icon="el-icon-search"
            clearable
            size="medium"
            class="search-input"
            @keyup.enter.native="handleFilter"
            @clear="handleFilter" />
        </div>

        <div class="market-meta">
          <span class="result-count">共 <strong>{{ total }}</strong> 款结果</span>
          <span v-if="activeFilterCount" class="active-filters"> · {{ activeFilterCount }} 项筛选生效</span>
          <div class="sort-btns">
            <span
              v-for="s in filterMetadata.sortable"
              :key="s.field"
              class="sort-btn"
              :class="{ active: filterForm.sort[s.field] }"
              @click="toggleSort(s.field)">
              {{ s.label }}
              <i v-if="filterForm.sort[s.field]" class="el-icon-caret-top" :class="{ desc: filterForm.sort[s.field] === 'desc' }" />
            </span>
          </div>
        </div>

        <!-- 卡片网格 -->
        <div v-loading="tplsLoading" class="market-content" element-loading-text="加载中...">
          <div v-if="flatList.length === 0 && !tplsLoading" class="empty-state">
            <i class="el-icon-s-grid empty-icon" />
            <p class="empty-text">没有找到匹配的应用</p>
            <el-button size="small" @click="clearAllFilters">清除筛选</el-button>
          </div>

          <div v-for="(group, gIdx) in tpls" :key="gIdx" class="market-section">
            <div class="section-header">
              <div>
                <h2 class="section-title">{{ typeLabel(group.type) }}</h2>
                <p class="section-desc">{{ typeDesc(group.type) }}</p>
              </div>
              <span class="section-count">{{ group.rows.length }} 款</span>
            </div>
            <div class="card-grid">
              <div
                v-for="tpl in group.rows"
                :key="tpl.id"
                class="tpl-card"
                @click="handleCardClick(tpl)">
                <div class="card-top">
                  <span v-if="categoryTag(tpl.tags)" class="card-category" @click.stop="tagClick(categoryTag(tpl.tags))">{{ categoryTag(tpl.tags).title }}</span>
                  <span class="card-version">{{ tpl.version }}</span>
                </div>
                <div class="card-media">
                  <div class="card-logo">
                    <img :src="tpl.logo" :alt="tpl.title" @error="$event.target.src='/app-market/logos/web.svg'" />
                  </div>
                  <h3 class="card-title">{{ tpl.title }}</h3>
                </div>
                <p class="card-intro">{{ tpl.intro }}</p>
                <div class="card-footer">
                  <span v-if="tpl.used" class="card-installs" :title="`${tpl.used} 次安装`">
                    <i class="el-icon-download" /> {{ formatUsed(tpl.used) }} 次安装
                  </span>
                  <el-tag
                    v-for="tag in displayTags(tpl.tags)"
                    :key="tag.id"
                    class="card-tag"
                    size="mini"
                    :type="(tag.style && tag.style.type) || 'info'"
                    @click.stop="tagClick(tag)">{{ tag.title }}</el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="total > pageSize" class="pager-wrap">
          <pagination
            :total="total"
            :page.sync="page"
            :limit.sync="pageSize"
            @pagination="getList" />
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import Breadcrumb from '@/views/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import { appMarketTpls, appMarketFilterMetadata } from '@/api/app'
import { APP_MARKET_TYPES } from '@/consts/app'
import { getIntegerInObject, routeBreadcrumb } from '@/utils/helpers'

export default {
  name: 'AppMarket',
  components: { Breadcrumb, Pagination },
  data () {
    return {
      filterForm: {
        type: null,
        service: null,
        lang: null,
        framework: null,
        category: null,
        tags: [],
        keyword: null,
        sort: {}
      },
      filterMetadata: {
        tag: [],
        type: [],
        service: [],
        lang: [],
        framework: [],
        category: [],
        sortable: []
      },
      tpls: [],
      tplsLoading: false,
      page: 1,
      pageSize: 100,
      total: 100,
      APP_MARKET_TYPES
    }
  },
  computed: {
    orgId () {
      return this.$store.getters.orgId
    },
    breadcrumb () {
      return [
        ...routeBreadcrumb(this),
        { title: this.$route.meta.title, to: '' }
      ]
    },
    flatList () {
      const list = []
      this.tpls.forEach(g => list.push(...g.rows))
      return list
    },
    activeFilterCount () {
      let n = 0
      if (this.filterForm.type) n++
      if (this.filterForm.category) n++
      if (this.filterForm.lang) n++
      if (this.filterForm.framework) n++
      if (this.filterForm.tags.length) n++
      if (Object.keys(this.filterForm.sort).length) n++
      return n || 0
    }
  },
  created () {
    this.fillFilterForm()
    this.getList()
    this.loadFilterMetadata()
  },
  methods: {
    getList () {
      this.tplsLoading = true
      appMarketTpls(
        this.filterForm.type,
        this.filterForm.service,
        this.filterForm.lang,
        this.filterForm.framework,
        this.filterForm.category,
        this.filterForm.tags,
        this.filterForm.keyword,
        this.filterForm.sort,
        this.page,
        this.pageSize
      ).then(res => {
        this.page = Number(res.data.page)
        this.pageSize = Number(res.data.pagesize)
        this.total = Number(res.data.total)
        const tpls = {}
        res.data.data.forEach(row => {
          if (!tpls[row.type]) {
            tpls[row.type] = { type: row.type, rows: [] }
          }
          tpls[row.type].rows.push(row)
        })
        this.tpls = Object.values(tpls).sort((a, b) => a.type - b.type)
      }).finally(() => { this.tplsLoading = false })
    },
    handleFilter () {
      this.page = 1
      this.getList()
    },
    clearAllFilters () {
      this.filterForm.type = null
      this.filterForm.category = null
      this.filterForm.lang = null
      this.filterForm.framework = null
      this.filterForm.tags = []
      this.filterForm.keyword = null
      this.filterForm.sort = {}
      this.handleFilter()
    },
    toggleCategory (catId) {
      if (this.filterForm.category === catId) {
        this.filterForm.category = null
      } else {
        this.filterForm.category = catId
        this.filterForm.type = null
      }
      this.handleFilter()
    },
    toggleTag (tagId) {
      const index = this.filterForm.tags.indexOf(tagId)
      if (index >= 0) {
        this.filterForm.tags.splice(index, 1)
      } else {
        this.filterForm.tags.push(tagId)
      }
      this.handleFilter()
    },
    toggleSort (field) {
      const cur = this.filterForm.sort[field]
      if (!cur) {
        this.$set(this.filterForm.sort, field, 'asc')
      } else if (cur === 'asc') {
        this.$set(this.filterForm.sort, field, 'desc')
      } else {
        this.$delete(this.filterForm.sort, field)
      }
      this.handleFilter()
    },
    tagClick (tag) {
      if (tag.type === 4) {
        this.filterForm.category = tag.id
      } else if (tag.type === 2) {
        this.filterForm.lang = tag.id
      } else if (tag.type === 3) {
        this.filterForm.framework = tag.id
      } else {
        const idx = this.filterForm.tags.indexOf(tag.id)
        if (idx >= 0) this.filterForm.tags.splice(idx, 1)
        else this.filterForm.tags.push(tag.id)
      }
      this.handleFilter()
    },
    displayTags (tags) {
      if (!tags) return []
      return tags.filter(t => t.type === 0 || t.type === 2 || t.type === 4).slice(0, 4)
    },
    loadFilterMetadata () {
      appMarketFilterMetadata(this.orgId).then(res => {
        this.filterMetadata = res.data
      })
    },
    handleCardClick (tpl) {
      this.$router.push({ name: 'AppMarketProfile', params: { tplId: tpl.id } })
    },
    fillFilterForm () {
      ['type', 'category', 'service', 'lang', 'framework'].forEach(key => {
        const num = getIntegerInObject(this.$route.query, key)
        if (num !== null) this.$set(this.filterForm, key, num)
      })
    },
    formatUsed (n) {
      if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
      return n
    },
    typeDesc (type) {
      const desc = {
        1: '可直接部署的数据库、缓存、队列等基础设施组件',
        2: '开箱即用的业务应用与服务模板',
        3: '常用的开发框架与脚手架',
        4: '云原生工具与通用组件'
      }
      return desc[type] || '精选模板，一键部署到集群'
    },
    typeLabel (type) {
      return (APP_MARKET_TYPES[type] && APP_MARKET_TYPES[type].label) || `类型 ${type}`
    },
    categoryTag (tags) {
      if (!tags) return null
      return tags.find(t => t.type === 4) || null
    },
    categoryIconSrc (title) {
      const map = {
        数据库: 'database',
        消息队列: 'mq',
        缓存: 'cache',
        'Web 服务器': 'web',
        存储: 'storage',
        监控: 'monitor',
        日志: 'log',
        'CI/CD': 'cicd',
        安全: 'security',
        网络: 'network',
        协作: 'collab',
        分析: 'analytics',
        'AI/LLM': 'ai',
        搜索引擎: 'searching',
        镜像仓库: 'repo',
        开发工具: 'devtools',
        内容管理: 'cms',
        DevOps: 'devops'
      }
      return '/app-market/icons/' + (map[title] || 'all') + '.svg'
    }
  }
}
</script>

<style lang="scss" scoped>
// ---- Vercel / Geist inspired design tokens ----
$mk-text: #171717;
$mk-text-2: #666666;
$mk-text-3: #888888;
$mk-border: #eaeaea;
$mk-bg: #ffffff;
$mk-bg-soft: #fafafa;
$mk-radius: 12px;

.app-container.app-market { padding-bottom: 32px; }

// ---- 整体布局 ----
.market-layout {
  display: flex;
  margin: 16px 20px 0;
  min-height: calc(100vh - 160px);
  background: $mk-bg;
  border: 1px solid $mk-border;
  border-radius: $mk-radius;
  overflow: hidden;
}

// ---- 左侧筛选栏 ----
.market-sidebar {
  width: 220px;
  flex-shrink: 0;
  padding: 28px 16px;
  background: $mk-bg-soft;
  border-right: 1px solid $mk-border;
  overflow-y: auto;
}
.sidebar-section {
  margin-bottom: 28px;
  &:last-of-type { margin-bottom: 0; }
}
.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  color: $mk-text-3;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 10px;
}
.sidebar-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-item-icon {
  width: 16px;
  height: 16px;
  margin-right: 10px;
  flex-shrink: 0;
  opacity: .5;
  transition: opacity .15s;
}
.sidebar-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  margin: 2px 0;
  font-size: 13px;
  color: $mk-text-2;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  &:hover {
    color: $mk-text;
    background: rgba(0, 0, 0, .04);
    .sidebar-item-icon { opacity: .85; }
  }
  &.active {
    color: $mk-text;
    background: rgba(0, 0, 0, .07);
    font-weight: 600;
    .sidebar-item-icon { opacity: 1; }
  }
}
.sidebar-clear {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid $mk-border;
}

// ---- 右侧主内容区 ----
.market-main {
  flex: 1;
  min-width: 0;
  padding: 32px 40px;
  background: $mk-bg;
}
.market-header {
  margin-bottom: 24px;
}
.market-title {
  font-size: 28px;
  font-weight: 700;
  color: $mk-text;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}
.market-subtitle {
  font-size: 14px;
  color: $mk-text-2;
  margin: 0;
}

// ---- 搜索栏 ----
.market-toolbar {
  margin-bottom: 16px;
}
.search-input {
  ::v-deep .el-input__inner {
    height: 48px;
    border-radius: 10px;
    border-color: $mk-border;
    font-size: 14px;
    padding-left: 42px;
    transition: border-color .2s, box-shadow .2s;
    &:hover, &:focus {
      border-color: #171717;
      box-shadow: 0 0 0 3px rgba(0, 0, 0, .04);
    }
  }
  ::v-deep .el-input__prefix {
    left: 13px;
    font-size: 16px;
    color: $mk-text-3;
  }
  ::v-deep .el-input__clear {
    color: $mk-text-3;
    &:hover { color: $mk-text; }
  }
}

// ---- 结果统计 + 排序 ----
.market-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  font-size: 13px;
  color: $mk-text-3;
}
.result-count strong {
  color: $mk-text;
  font-weight: 600;
}
.sort-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: $mk-text-2;
  background: #f4f4f5;
  cursor: pointer;
  transition: all .2s;
  user-select: none;
  border: 1px solid transparent;
  &:hover {
    color: $mk-text;
    background: #eeeeee;
  }
  &.active {
    color: $mk-text;
    background: #ffffff;
    border-color: $mk-border;
    font-weight: 600;
  }
  i { font-size: 10px; transition: transform .2s; }
  i.desc { transform: rotate(180deg); }
}

// ---- 卡片区域 ----
.market-content { min-height: 200px; }
.market-section { margin-bottom: 48px; }
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
  .section-title {
    font-size: 20px;
    font-weight: 700;
    color: $mk-text;
    letter-spacing: -0.01em;
    margin: 0 0 4px;
  }
  .section-desc {
    font-size: 13px;
    color: $mk-text-2;
    margin: 0;
  }
  .section-count {
    flex-shrink: 0;
    font-size: 12px;
    color: $mk-text-3;
    background: #f4f4f5;
    padding: 4px 10px;
    border-radius: 999px;
    margin-left: 12px;
  }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.tpl-card {
  position: relative;
  background: $mk-bg;
  border-radius: $mk-radius;
  border: 1px solid $mk-border;
  padding: 20px;
  cursor: pointer;
  text-align: center;
  transition: transform .2s, box-shadow .2s, border-color .2s;
  display: flex;
  flex-direction: column;
  &:hover {
    transform: translateY(-2px);
    border-color: #171717;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .06);
  }
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  min-height: 22px;
}
.card-category {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: $mk-text-2;
  background: #f4f4f5;
  padding: 3px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  &:hover { background: #ececec; }
}
.card-version {
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: $mk-text-3;
}
.card-media {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 14px;
}
.card-logo {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f8f8, #f2f2f2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  border: 1px solid #f0f0f0;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 12px;
  }
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: $mk-text;
  margin: 0;
}
.card-intro {
  font-size: 13px;
  color: $mk-text-2;
  line-height: 1.5;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.card-installs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: $mk-text-3;
  background: #f8f8f8;
  padding: 3px 8px;
  border-radius: 999px;
}
.card-tag { cursor: pointer; }

// ---- 空状态 ----
.empty-state {
  text-align: center;
  padding: 80px 0;
  color: $mk-text-3;
  .empty-icon { font-size: 56px; display: block; margin-bottom: 12px; }
  .empty-text { font-size: 15px; margin-bottom: 16px; color: $mk-text-2; }
}

// ---- 分页 ----
.pager-wrap {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid $mk-border;
  display: flex;
  justify-content: flex-end;
}

// ---- 响应式 ----
@media (max-width: 1100px) {
  .market-sidebar { display: none; }
  .market-layout { border-radius: $mk-radius; }
  .market-main { padding: 24px; }
  .market-title { font-size: 24px; }
}
</style>
