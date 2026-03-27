import { createFormHook } from '@tanstack/solid-form'

import { fieldContext, formContext } from './app.form-context'

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
})
