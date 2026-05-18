import { defineComponent, h, ref } from 'vue'
import { useI18n } from '../i18n/index.js'

export default defineComponent({
  name: 'ChatInput',
  props: {
    disabled: { type: Boolean, default: false }
  },
  emits: ['submit'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const value = ref('')
    const onSubmit = () => {
      const question = value.value.trim()
      if (!question) return
      emit('submit', question)
      value.value = ''
    }
    return () =>
      h('div', { class: 'flex items-end gap-3' }, [
        h('textarea', {
          value: value.value,
          rows: 2,
          disabled: props.disabled,
          placeholder: t('chat.askPlaceholder'),
          class: 'flex-1 resize-none border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition disabled:opacity-50',
          onInput: (event) => {
            value.value = event.target.value
          },
          onKeydown: (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }
        }),
        h(
          'button',
          {
            class: 'flex-shrink-0 flex items-center justify-center w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm',
            disabled: props.disabled,
            onClick: onSubmit
          },
          '→'
        )
      ])
  }
})
