import { defineComponent, h } from 'vue'
import { useI18n } from '../i18n/index.js'

export default defineComponent({
  name: 'ChatHistoryPanel',
  props: {
    sessions: { type: Array, default: () => [] },
    activeSessionId: { type: String, default: '' },
    loading: { type: Boolean, default: false }
  },
  emits: ['select', 'delete'],
  setup(props, { emit }) {
    const { t } = useI18n()
    return () =>
      h('div', { class: 'bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 h-full min-h-0 overflow-y-auto' }, [
        h('div', { class: 'text-xs font-bold text-slate-500 uppercase tracking-wide' }, t('chat.conversations')),
        props.loading
          ? h('p', { class: 'text-xs text-slate-400' }, t('chat.loadingSessions'))
          : null,
        ...(props.sessions || []).map((session) =>
          h(
            'div',
            {
              class: [
                'w-full rounded-lg border px-2.5 py-2 text-left',
                props.activeSessionId === session.session_id
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 bg-white'
              ]
            },
            [
              h(
                'button',
                {
                  class: 'block w-full text-left',
                  onClick: () => emit('select', session.session_id)
                },
                [
                  h('p', { class: 'text-xs font-semibold text-slate-700 truncate' }, session.title || t('chat.conversationFallback')),
                  h('p', { class: 'text-[11px] text-slate-400 truncate mt-0.5' }, session.preview || t('chat.noMessagesYet'))
                ]
              ),
              h(
                'button',
                {
                  class: 'mt-1 text-[11px] text-red-600 hover:text-red-700 font-semibold',
                  onClick: () => emit('delete', session.session_id)
                },
                t('chat.delete')
              )
            ]
          )
        )
      ])
  }
})
