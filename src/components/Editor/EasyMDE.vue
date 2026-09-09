<template>
  <div class="easymde-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script>
import EasyMDE from 'easymde'
import 'easymde/dist/easymde.min.css'
import 'github-markdown-css/github-markdown-light.css'
import { uploadImage } from '@/api/upload'

export default {
  name: 'EasyMDEEditor',
  model: {
    prop: 'value'
  },
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
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
    },
    imageMaxSize: {
      type: Number,
      default: 1024 * 1024 * 2
    },
    imageAccept: {
      type: String,
      default: 'image/png,image/jpeg'
    }
  },
  data () {
    return {
      editor: false
    }
  },
  watch: {
    value (value) {
      const editorValue = this.editor.value()
      if (value !== editorValue) {
        this.editor.value(this.value || '')
      }
    }
  },
  mounted () {
    const that = this
    this.editor = new EasyMDE(Object.assign({
      element: this.$refs.textarea,
      initialValue: this.value || '',
      placeholder: this.placeholder,
      showIcons: ['code', 'table', 'upload-image', 'horizontal-rule', 'undo', 'redo'],
      hideIcons: [],
      previewClass: ['markdown-body'],
      spellChecker: false,
      uploadImage: true,
      status: false,
      imageMaxSize: this.imageMaxSize,
      imageAccept: this.imageAccept,
      imageUploadFunction (file, onSuccess, onError) {
        const formData = new FormData()
        formData.append('file', file, file.name)
        formData.append('org', that.$store.getters.orgId)
        uploadImage(formData)
          .then(res => {
            onSuccess(res.data.url)
          }).catch(err => {
            onError(err)
          })
      },
      errorMessages: {
        noFileGiven: 'Please select a file',
        typeNotAllowed: 'This file type is not allowed!',
        fileTooLarge: 'Image too big',
        importError: 'Something went oops!'
      },
      errorCallback (err) {
        that.$message.error(err)
      }
    }, this.extraConfig))

    this.editor.codemirror.on('change', cm => {
      this.$emit('change', this.editor.value())
      this.$emit('input', this.editor.value())
    })
  },
  methods: {
    getValue () {
      return this.editor.value()
    }
  }
}
</script>

<style scoped>
.easymde-editor{
  height: 100%;
  position: relative;
}
.easymde-editor >>> .markdown-body {
  box-sizing: border-box;
  padding: 20px;
}
</style>
