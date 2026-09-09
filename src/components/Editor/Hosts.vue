<template>
  <div class="hosts-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/rubyblue.css'

export default {
  name: 'HostsEditor',
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
  created () {
    this.register()
  },
  mounted () {
    this.editor = CodeMirror.fromTextArea(this.$refs.textarea, Object.assign({}, {
      lineNumbers: true,
      mode: 'hosts',
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
    },
    register () {
      CodeMirror.defineMode('hosts', function () {
        function tokenBase (stream) {
          if (stream.eatSpace()) return null

          const sol = stream.sol()
          const ch = stream.next()

          const s = stream.string

          if (ch === '#') {
            stream.skipToEnd()
            return 'comment'
          }
          if (!s.match(/^\s*([\d.]+|[\da-f:.%lo]+)\s+\w/i)) {
            return 'error'
          }

          if (sol && ch && ch.match(/[\w.:%]/)) {
            stream.eatWhile(/[\w.:%]/)
            return 'ip'
          }

          return null
        }

        function tokenize (stream, state) {
          return (state.tokens[0] || tokenBase)(stream, state)
        }

        return {
          startState: function () {
            return { tokens: [] }
          },
          token: function (stream, state) {
            return tokenize(stream, state)
          },
          lineComment: '#'
        }
      })
    }
  }
}
</script>

<style scoped>
.hosts-editor{
  height: 100%;
  position: relative;
}
.hosts-editor >>> .CodeMirror {
  height: auto;
  min-height: 300px;
}
.hosts-editor >>> .CodeMirror-scroll{
  min-height: 300px;
}
.hosts-editor >>> .cm-s-rubyblue span.cm-string {
  color: #F08047;
}
</style>
<style>
.CodeMirror .cm-ip {
  color: #4EC9B0;
  font-weight: bold;
}
</style>
