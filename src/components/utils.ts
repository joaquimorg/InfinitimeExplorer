import { h } from 'vue'

import { NButton } from 'naive-ui'

export interface TableActionModel {
  label: string
  type: 'default' | 'warning' | 'primary' | 'success' | 'error' | 'info'
  disabled: boolean
  onClick: () => {}
}

export const useRenderAction = function (actions: TableActionModel[]) {
  const renderActions = actions.map((it) => {
    return h(
      NButton,
      {
        type: it.type || 'default',
        size: 'tiny',
        disabled: it.disabled,
        round: true,
        onClick: it.onClick,
      },
      {
        default: () => it.label,
      }
    )
  })
  return renderActions
}
