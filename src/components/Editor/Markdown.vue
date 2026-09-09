<template>
  <div class="md-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/rubyblue.css'
import 'codemirror/mode/markdown/markdown'

export default {
  name: 'MarkdownEditor',
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
      editor: false
    }
  },
  watch: {
    value (value) {
      const editorValue = this.editor.getValue()
      if (value !== editorValue) {
        this.editor.setValue(this.value || '')
      }
    }
  },
  mounted () {
    this.editor = CodeMirror.fromTextArea(this.$refs.textarea, Object.assign({}, {
      lineNumbers: true,
      mode: 'text/markdown',
      gutters: ['CodeMirror-lint-markers'],
      theme: 'rubyblue',
      lint: false,
      readOnly: this.readonly ? 'nocursor' : false
    }, this.extraConfig))

    this.editor.setValue(this.value || '')
    this.editor.on('change', cm => {
      this.$emit('changed', cm.getValue())
      this.$emit('input', cm.getValue())
    })
  },
  methods: {
    getValue () {
      return this.editor.getValue()
    }
  }
}
</script>

<style scoped>
.md-editor{
  height: 100%;
  position: relative;
}
.md-editor >>> .CodeMirror {
  height: auto;
  min-height: 300px;
}
.md-editor >>> .CodeMirror-scroll{
  min-height: 300px;
}
.md-editor >>> .cm-s-rubyblue span.cm-string {
  color: #F08047;
}
</style>
