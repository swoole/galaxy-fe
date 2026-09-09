<template>
  <div class="html-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/rubyblue.css'
import 'codemirror/mode/htmlmixed/htmlmixed'

export default {
  name: 'HtmlEditor',
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
      htmlEditor: false
    }
  },
  watch: {
    value (value) {
      const editorValue = this.htmlEditor.getValue()
      if (value !== editorValue) {
        this.htmlEditor.setValue(this.value || '')
      }
    }
  },
  mounted () {
    this.htmlEditor = CodeMirror.fromTextArea(this.$refs.textarea, Object.assign({}, {
      lineNumbers: true,
      mode: 'text/html',
      gutters: ['CodeMirror-lint-markers'],
      theme: 'rubyblue',
      lint: false,
      readOnly: this.readonly ? 'nocursor' : false
    }, this.extraConfig))

    this.htmlEditor.setValue(this.value || '')
    this.htmlEditor.on('change', cm => {
      this.$emit('changed', cm.getValue())
      this.$emit('input', cm.getValue())
    })
  },
  methods: {
    getValue () {
      return this.htmlEditor.getValue()
    }
  }
}
</script>

<style scoped>
.html-editor{
  height: 100%;
  position: relative;
}
.html-editor >>> .CodeMirror {
  height: auto;
  min-height: 300px;
}
.html-editor >>> .CodeMirror-scroll{
  min-height: 300px;
}
.html-editor >>> .cm-s-rubyblue span.cm-string {
  color: #F08047;
}
</style>
