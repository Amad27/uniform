export type tMap<T> = { [key: string]: T }

export type objectKeys = tMap<any>

export type VisibleIfArgs = {
  value: objectKeys
  rowValues: objectKeys
  values: objectKeys
  formIndex: number | string
}

export type nestedErrorsManager = (errorState: boolean) => void

export type FunctionalComponentArguments = {
  updateFormValues: (value: any) => void
  nestedErrorsManager: nestedErrorsManager
  onBlur: Function
  inputKey: string
  initialValues: any
  value: any
  formValues: any
  formIndex: number
}

export type CallbackArguments = {
  value: any
  rowValues: any
  values: any
  formIndex: number | string
  event?: any
}

export type VisibleIf = ({ value, rowValues, values, formIndex }: CallbackArguments) => boolean

export type ValidateField = ({ value, rowValues, values, formIndex, }: CallbackArguments) => void

export interface SelectOptions {
  label: string
  value: any
  //TODO: add in option types
  [key: string]: any
}

export type EzFormInput = {
  [key: string]: any

  visibleIf?: VisibleIf
  validate?: ValidateField
  customComponent?: any //TODO: type correctly
  type?: string
  options?: SelectOptions[]
  groupClassName?: string
  label?: string | JSX.Element
  initialValue?: any
  placeholder?: string
  tracked?: boolean
  prependHtml?: any //TODO: type correctly
  appendHtml?: any //TODO: type correctly
  required?: boolean | Function
  functionalComponent?: ({ updateFormValues, inputKey, initialValues, formIndex, value }: FunctionalComponentArguments) => void
  viewModeClass?: string
  viewModeComponent?: Function
  featureFlag?: string
  onChange?: ({ value, rowValues, values, formIndex, event }: CallbackArguments) => any
  onBlur?: ({ value, rowValues, values, formIndex, event }: CallbackArguments) => any
  onSubmit?: ({ value, rowValues, values, formIndex }) => void
}

export type EzFormSchema = {
  onSubmit?: (values: objectKeys[] | objectKeys) => any,
  inputs: tMap<EzFormInput>
}


export type EzFormHookProps = {
  schema: EzFormSchema
  onSubmit?: (values: objectKeys[] | objectKeys) => any
  onUpdate?: (values: objectKeys[] | objectKeys) => any
  onChange?: ({ value, rowValues, values, formIndex, event }: CallbackArguments) => any
  onBlur?: ({ value, rowValues, values, formIndex, event }: CallbackArguments) => any
  initialValues?: objectKeys
  validateInitialValues?: boolean
  validateOnChange?: boolean
  viewModeToggled?: boolean
  disabled?: boolean
  submitButton?: JSX.Element
  submitButtonClass?: string
  submitButtonText?: string
  showSubmitButton?: boolean
  multiForm?: boolean
  clearFormOnSubmit?: boolean
  viewModeFallbackText?: string
  featureFlags?: objectKeys
  nestedErrorsManager?: nestedErrorsManager
  errorClass?: string | null
  className?: string
  validation?: tMap<Function>
}

export type EzFormHookReturnValues = {
  inputs: EzFormInput[]
  form: JSX.Element
  formValues: tMap<string>[] | tMap<string>
  errors: tMap<string>[] | tMap<string>
  formLength: number
  ezSchema: EzFormSchema
  updateFormValues: (values: object[] | object) => void
  updateSchema: (newSchema: EzFormSchema) => void
  addForm: () => void
  removeForm: (removeIndex?: number) => void
  resetForm: () => void
  clearForm: () => void
  toggleViewMode: () => void
  viewModeState: boolean
  formReady: boolean
  submitButton: JSX.Element | false
}