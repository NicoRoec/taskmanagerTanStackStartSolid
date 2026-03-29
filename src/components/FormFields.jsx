function resolveFieldApi(field) {
  return typeof field === 'function' ? field() : field
}

function normalizeOption(option) {
  if (typeof option === 'string') {
    return { value: option, label: option }
  }
  return option
}

export function FormTextField(props) {
  const api = () => resolveFieldApi(props.field)

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{props.label}</span>
      <input
        type={props.type || 'text'}
        value={api()?.state?.value ?? ''}
        onBlur={() => api()?.handleBlur?.()}
        onInput={(e) => api()?.handleChange?.(e.currentTarget.value)}
        placeholder={props.placeholder || ''}
        className={props.className || 'mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'}
      />
    </label>
  )
}

export function FormDateField(props) {
  const api = () => resolveFieldApi(props.field)

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{props.label}</span>
      <input
        type="date"
        value={api()?.state?.value ?? ''}
        onBlur={() => api()?.handleBlur?.()}
        onInput={(e) => api()?.handleChange?.(e.currentTarget.value)}
        className={props.className || 'mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'}
      />
    </label>
  )
}

export function FormSelectField(props) {
  const api = () => resolveFieldApi(props.field)

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{props.label}</span>
      <select
        value={api()?.state?.value ?? props.fallbackValue ?? ''}
        onBlur={() => api()?.handleBlur?.()}
        onChange={(e) => api()?.handleChange?.(e.currentTarget.value)}
        className={props.className || 'mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'}
      >
        {(props.options || []).map((rawOption) => {
          const option = normalizeOption(rawOption)
          return <option value={option.value}>{option.label}</option>
        })}
      </select>
    </label>
  )
}
