<template>
  <div class="yaml-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/addon/lint/lint.css'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/rubyblue.css'
import 'codemirror/mode/yaml/yaml'
import 'codemirror/addon/lint/lint'
import 'codemirror/addon/lint/yaml-lint'
import YAML from 'yaml'
global.jsyaml = require('js-yaml')

export default {
  name: 'YamlEditor',
  model: {
    prop: 'value'
  },
  props: {
    value: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    },
    extraConfig: {
      type: Object,
      default: () => { return {} }
    }
  },
  data () {
    return {
      yamlEditor: false
    }
  },
  watch: {
    value (value) {
      const editorValue = this.yamlEditor.getValue()
      if (value !== editorValue) {
        this.yamlEditor.setValue(this.value || '')
      }
    }
  },
  mounted () {
    this.yamlEditor = CodeMirror.fromTextArea(this.$refs.textarea, Object.assign({}, {
      lineNumbers: true,
      mode: 'text/yaml',
      gutters: ['CodeMirror-lint-markers'],
      theme: 'rubyblue',
      lint: true,
      readOnly: this.readonly ? 'nocursor' : false
    }, this.extraConfig))

    this.yamlEditor.setValue(this.value || '')
    this.yamlEditor.on('change', cm => {
      this.$emit('changed', cm.getValue())
      this.$emit('input', cm.getValue())
    })
  },
  methods: {
    getValue () {
      return YAML.stringify(this.yamlEditor.getValue())
    }
  }
}
</script>

<style scoped>
.yaml-editor{
  height: 100%;
  position: relative;
}
.yaml-editor >>> .CodeMirror {
  height: auto;
  min-height: 300px;
}
.yaml-editor >>> .CodeMirror-scroll{
  min-height: 300px;
}
.yaml-editor >>> .cm-s-rubyblue span.cm-string {
  color: #F08047;
}
</style>
