<template>
  <el-form
    ref="form"
    :size="size"
    :label-width="labelWidth"
    :model="form"
    :rules="rules"
    @submit.native.prevent
  >
    <div v-for="(field, index) in fields" :key="index" class="form-item-controls">
      <el-form-item
        :label="field.label"
        :prop="field.key">
        <template v-if="field.type == 'text'">
          <template v-if="field.role == 'password'">
            <el-input
              v-model="form[field.key]"
              :placeholder="field.tips || ''"
              class="form-item-control" />
            <el-link
              :underline="false"
              type="primary"
              style="margin-left: 10px"
              @click="handleGeneratePassword(field)">
              自动生成
            </el-link>
          </template>
          <template v-else-if="field.format">
            <component
              v-if="editors[field.format]"
              :is="editors[field.format].editor"
              v-model="form[field.key]" />
            <el-input
              v-else-if="field.format == 'textarea'"
              v-model="form[field.key]"
              :autosize="{ minRows: 3, maxRows: 5 }"
              type="textarea"
              :placeholder="field.tips || ''" />
            <el-input
              v-else-if="field.format == 'number'"
              v-model.number="form[field.key]"
              :placeholder="field.tips || ''"
              class="form-item-control" />
            <el-input
              v-else
              v-model="form[field.key]"
              :placeholder="field.tips || ''"
              class="form-item-control" />
          </template>
          <el-input
            v-else
            v-model="form[field.key]"
            :placeholder="field.tips || ''"
            class="form-item-control" />
        </template>
        <el-radio-group v-else-if="field.type == 'radio'" v-model="form[field.key]">
          <el-radio
            v-for="(iLabel, iKey) in field.options"
            :key="iKey"
            :label="iKey">{{ iLabel }}</el-radio>
        </el-radio-group>
        <el-checkbox-group v-else-if="field.type == 'checkbox' && Array.isArray(form[field.key])" v-model="form[field.key]">
          {{ field.options }} {{ form[field.key] }}
          <el-checkbox
            v-for="(iLabel, iKey) in field.options"
            :key="iKey"
            :label="iKey">{{ iLabel }}</el-checkbox>
        </el-checkbox-group>
        <span v-if="field.tips" class="little-tips" style="margin-left: 10px">
          {{ field.tips }}
        </span>
      </el-form-item>
    </div>
  </el-form>
</template>

<script>
import YamlEditor from '@/components/YamlEditor'
import JsonEditor from '@/components/JsonEditor'
import PhpEditor from '@/components/Editor/Php'
import HtmlEditor from '@/components/Editor/Html'
import LuaEditor from '@/components/Editor/Lua'
import MarkdownEditor from '@/components/Editor/Markdown'
import NginxEditor from '@/components/Editor/Nginx'
import ShellEditor from '@/components/Editor/Shell'
import DockerfileEditor from '@/components/Editor/Dockerfile'

export default {
  name: 'DependConfigForm',
  inheritAttrs: true,
  props: {
    fields: {
      type: Array,
      required: true
    },
    form: {
      type: Object,
      required: true
    },
    size: {
      type: String,
      default: 'mini'
    },
    labelWidth: {
      type: String,
      default: '80px'
    },
    rules: {
      type: Object,
      default: () => { return {} }
    }
  },
  components: {

  },
  data () {
    return {
      editors: {
        json: {
          label: 'JSON',
          editor: JsonEditor
        },
        yaml: {
          label: 'YAML',
          editor: YamlEditor
        },
        php: {
          label: 'PHP',
          editor: PhpEditor
        },
        html: {
          label: 'HTML/XML',
          editor: HtmlEditor
        },
        lua: {
          label: 'Lua',
          editor: LuaEditor
        },
        markdown: {
          label: 'Markdown',
          editor: MarkdownEditor
        },
        nginx: {
          label: 'Nginx配置',
          editor: NginxEditor
        },
        shell: {
          label: 'Shell',
          editor: ShellEditor
        },
        dockerfile: {
          label: 'Dockerfile',
          editor: DockerfileEditor
        }
      }
    }
  },
  methods: {
    handleGeneratePassword (field) {
      const poolStr = field.options && field.options.pool ? field.options.pool : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-/='
      const pool = poolStr.split('')
      const len = field.options && field.options.length ? field.options.length : 24
      let password = ''
      for (let i = 0; i < len; i++) {
        password += pool[Math.floor(Math.random() * pool.length)]
      }

      this.$set(this.form, field.key, password)
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
