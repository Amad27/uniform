import React, { useLayoutEffect, useState } from "react";
import { cloneDeep } from './cloneDeep';
import { convertToArray } from './convertToArray';
import { EzFormField } from './EzFormField';
import { omitArray } from './omitArray';
import { removeKeys } from './removeKeys';
import { EzFormHookProps, EzFormHookReturnValues, EzFormInput, EzFormSchema, FunctionalComponentArguments } from "./types";

export const EzFormHook = ({
  schema,
  onSubmit,
  onChange,
  onBlur,
  onUpdate,
  errorClass = null,
  featureFlags,
  nestedErrorsManager,
  className,
  validation,
  initialValues = [],
  clearFormOnSubmit = true,
  validateInitialValues = true,
  validateOnChange = true,
  disabled = false,
  multiForm = false,
  viewModeToggled = false,
  viewModeFallbackText = "N/A",
  showSubmitButton = true,
  submitButtonClass = "",
  submitButtonText = "Submit",
  submitButton = <button type="submit" className={submitButtonClass} disabled={disabled}>{submitButtonText}</button>
}: EzFormHookProps): EzFormHookReturnValues => {
  const [ezSchema, setEzSchema] = useState(cloneDeep(schema))
  const [formInitialValues, setFormInitialValues] = useState<any>(cloneDeep(initialValues))
  const [formReady, setFormReady] = useState<boolean>(false);
  const [formLength, setFormLength] = useState<number>(0);
  const [errors, setErrors] = useState<any[]>([{}]);
  const [hasNestedErrors, setHasNestedErrors] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<any[]>([{}]);
  const [inputs, setInputs] = useState<any>([{}]);
  const [viewMode, setViewMode] = useState(viewModeToggled)

  useLayoutEffect(() => {
    const initFormLength = initialValues.length || 1
    // the || 1 is used for initial values that are not for multiForms
    initForm(initFormLength)
    setFormLength(initFormLength)
  }, [])

  useLayoutEffect(() => {
    generateInputs()
    onUpdate && onUpdate(formValues)
  }, [formValues, formLength, viewMode])

  const updateSchema = (newSchema: EzFormSchema) => {
    const oldKeys = Object.keys(schema.inputs)
    const newKeys = Object.keys(newSchema.inputs)
    const removedKeys = oldKeys.filter((o) => newKeys.indexOf(o) === -1);

    setEzSchema(newSchema)
    generateInputs()

    const newValues = formValues.map((vals) => {
      const updatedVals = vals
      for (const key of removedKeys) {
        if (key in updatedVals) {
          delete updatedVals[key]
        }
      }
      return updatedVals
    })

    setFormValues(newValues)
  }

  const initForm = async (initFormLength?: number) => {
    let initialFormValues: any = [] // TODO: type correctly
    let initialErrors: any = [] // TODO: type correctly
    let tempFormLength = 0

    for (const formIndex in [...new Array(initFormLength || formLength)]) {
      tempFormLength = tempFormLength + 1
      initialFormValues.push({})
      initialErrors.push({})
      initialFormValues[formIndex] = generateFormValues(formIndex)
    }

    setFormLength(tempFormLength)
    setFormValues(initialFormValues)

    if (validateInitialValues && initialValues.length !== 0) {
      validateForm(initialErrors, initialFormValues)
    } else {
      setErrors(initialErrors)
    }
  }

  const generateInputs = () => {
    let inputs: any/* TODO: type correctly */ = []

    for (let formIndex = 0; formIndex < formLength; formIndex++) {
      inputs.push({})
      for (const inputKey of Object.keys(ezSchema.inputs)) {
        inputs[formIndex][inputKey] = inputGenerator(inputKey, formIndex)
      }
    }

    setInputs(inputs)
    setFormReady(true)
  }

  const generateFormValues = (formIndex: any /*TODO: type correctly*/) => {
    let values: any = {}
    let tempInitialValues = convertToArray(formInitialValues)

    for (const inputKey of Object.keys(ezSchema.inputs)) {
      if (ezSchema.inputs[inputKey].untracked) {
        //skips untracked inputs
        continue
      }
      const initialValueProp = tempInitialValues && tempInitialValues[formIndex] && tempInitialValues[formIndex][inputKey]

      values[inputKey] =
        initialValueProp
        || ezSchema.inputs[inputKey].initialValue
        || ''
    }

    return values
  }

  const hasErrors = () => {
    let hasErrors = false;
    for (const error of errors) {
      if (Object.entries(error)[0]) {
        hasErrors = true
        break;
      }
    }
    return hasErrors
  }

  const inputGenerator = (inputKey: string, formIndex: number) => {
    const input: EzFormInput = ezSchema.inputs[inputKey];
    const reactInputKey: string = `${inputKey}-${formIndex}`
    const visible: boolean | undefined = input?.visibleIf && !input?.visibleIf({ value: formValues[formIndex][inputKey], rowValues: formValues[formIndex], values: formValues, formIndex })
    const featureFlag = featureFlags && input?.featureFlag && !featureFlags[input?.featureFlag]
    const InputComponent = input?.customComponent || EzFormField

    const returnObject: any = {
      key: reactInputKey,
      viewMode: null,
      label: null,
      element: null,
      error: null
    }

    if (visible || featureFlag) {
      let values = [...formValues];
      delete values[formIndex][inputKey]

      return returnObject
    }

    const updateFormValues = (inputValue: any, event?: any) => {
      if (ezSchema.inputs[inputKey].untracked) {
        return null
      }
      let values = [...formValues];
      let value = inputValue

      if (ezSchema.inputs[inputKey].onChange) {
        //@ts-ignore checking if funciton exists above^
        value = ezSchema.inputs[inputKey].onChange({ value, rowValues: values[formIndex], values, formIndex, event }) || value
      }

      values[formIndex] = { ...values[formIndex], [inputKey]: value }

      if (validateOnChange) {
        let tempErrors = [...errors];
        const validationValue = validateInput(input, values, formIndex, inputKey)

        if (validationValue) {
          tempErrors[formIndex][inputKey] = validationValue
          nestedErrorsManager && nestedErrorsManager(true)
        }

        if (tempErrors[formIndex][inputKey] && !validationValue) {
          delete tempErrors[formIndex][inputKey]
          if (nestedErrorsManager && !hasErrors()) {
            nestedErrorsManager(false)
          }
        }

        setErrors(tempErrors)
      }

      onChange && onChange({ value, rowValues: values[formIndex], values, formIndex, event })

      setFormValues(values);
    }

    const getInputValue = (input: EzFormInput, event: any, changeMod: any) => {
      let inputVal: any

      if (event.target && input?.type === "checkbox") {
        inputVal = event.target.checked
      } else if (event.target && "value" in event.target) {
        inputVal = event.target.value
      } else {
        inputVal = event.values || event.value || event
      }

      const customChangeFunctionValue = changeMod && changeMod({ value: inputVal, rowValues: formValues[formIndex], values: formValues, formIndex })

      return customChangeFunctionValue || inputVal
    }

    const onInputChange = (event: any) => {
      let inputValue = getInputValue(input, event, input?.onChange)

      updateFormValues(inputValue, event)
    };

    const onInputBlur = (event: any) => {
      let inputValue = getInputValue(input, event, input?.onBlur)

      onBlur && onBlur({ value: inputValue, rowValues: formValues[formIndex], values: formValues, formIndex, event })
      updateFormValues(inputValue, event)
    }

    if (input?.functionalComponent) {
      const params: FunctionalComponentArguments = {
        updateFormValues: (value: any) => {
          const vals = value.rowValues || value
          updateFormValues(vals)
        },
        onBlur: onInputBlur,
        inputKey,
        initialValues,
        formValues,
        formIndex,
        value: formValues[formIndex][inputKey],
        nestedErrorsManager: (errorState: boolean) => {
          setHasNestedErrors(errorState)
        },
      }
      returnObject.element = input?.functionalComponent(params)
    } else {
      returnObject.element = (
        <>
          {input?.prependHtml}
          <InputComponent
            key={reactInputKey}
            name={inputKey}
            type={input?.type}
            onChange={onInputChange}
            onBlur={onInputBlur}
            value={formValues[formIndex][inputKey]}
            aria-describedby={`${inputKey}${formIndex}_error`}
            id={inputKey + formIndex}
            data-test={multiForm ? `${inputKey}-${formIndex}-input` : `${inputKey}-input`}
            formValues={formValues}
            {...removeKeys(input, omitArray)}
          />
          {input?.appendHtml}
        </>
      );
    }

    returnObject.error = errors[formIndex][inputKey] && input?.errorComponent ? (
      input?.errorComponent({ error: errors[formIndex], errors: errors[formIndex], formIndex, errorId: `${inputKey}${formIndex}_error` })
    ) : (
        <div
          className={`${inputKey in errors[formIndex] ? "EzForm-error" : ""} ${errorClass ? errorClass : ""}`}
          id={`${inputKey}${formIndex}_error`}
          data-test={multiForm ? `${inputKey}-${formIndex}-error` : `${inputKey}-error`}
        >
          {errors[formIndex][inputKey]}
        </div>
      );

    returnObject.label = typeof input?.label === "string" ? (
      <label
        htmlFor={inputKey}
        data-test={multiForm ? `${inputKey}-${formIndex}-label` : `${inputKey}-label`}
      >
        {input?.label}
        {input?.required && " *"}
      </label>
    ) : (
        input?.label
      );

    returnObject.viewMode = input?.viewModeComponent ? (
      <>
        {returnObject.label}
        {input?.viewModeComponent(formValues[formIndex][inputKey], formValues[formIndex])}
      </>
    ) : (
        <>
          {returnObject.label}
          <div className={input?.viewModeClass}>{_getValueAsString(inputKey, formIndex)}</div>
        </>
      )

    returnObject.html =
      <>
        {viewMode && returnObject?.viewMode}
        {!viewMode && returnObject?.label}
        {!viewMode && returnObject?.element}
        {!viewMode && returnObject?.error}
      </>

    return returnObject;
  }


  const form = (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        const formHasErrors: boolean = validateForm()

        if (!formHasErrors && !hasNestedErrors) {
          let values = cloneDeep(formValues);

          for (const index in values) {
            for (let key of Object.keys(ezSchema.inputs)) {
              if (ezSchema.inputs[key].onSubmit) {
                // @ts-ignore its checking if onSubmit function exists  above, but its still failing
                values[index][key] = ezSchema.inputs[key].onSubmit({
                  value: values[index][key],
                  rowValues: values[index],
                  values,
                  formIndex: index
                })
              }
              if (ezSchema.inputs[key].tracked == false) {
                delete values[index][key]
              }
            }
            if (clearFormOnSubmit) {
              initForm()
            }
          }
          values = multiForm ? values : values[0]
          onSubmit && onSubmit(values)
          ezSchema.onSubmit && ezSchema.onSubmit(values)
        }
      }}
    >
      {
        inputs.map((input: any) => (
          Object.keys(input).map((inputKey: any) => {
            const currentInput = input[inputKey];
            return (
              <div className={ezSchema.inputs[inputKey]?.groupClassName} key={currentInput?.key}> {/* TODO: make unique keys */}
                {viewMode && currentInput?.viewMode}
                {!viewMode && currentInput?.html}
              </div>
            );
          })
        ))
      }
      {!viewMode && showSubmitButton && submitButton}
    </form>
  );

  const validateInput = (input: any, values: any, formIndex: any, inputKey: string)/* TODO: Type correctly */ => {
    const validationParams = { value: values[formIndex][inputKey], values: values, rowValues: values[formIndex], formIndex }

    if (validation && validation[inputKey]) {
      return validation[inputKey](validationParams)
    }
    if (input?.validate) {
      return input?.validate(validationParams)
    }
  }

  const validateForm = (initialErrors = errors, initialFormValues = formValues) => {
    let tempErrors = [...initialErrors]
    let hasErrors = false

    for (const formIndex in initialFormValues) {
      for (const inputKey in initialFormValues[formIndex]) {
        const input: EzFormInput = ezSchema.inputs[inputKey];

        const validationValue = validateInput(input, initialFormValues, formIndex, inputKey)

        if (validationValue) {
          hasErrors = true
          tempErrors[formIndex][inputKey] = validationValue
        }

        if (!validationValue && tempErrors[formIndex][inputKey]) {
          delete tempErrors[formIndex][inputKey]
        }
      }
    }

    setErrors(tempErrors)

    return hasErrors
  }

  const toggleViewMode = () => {
    if (!viewMode && clearFormOnSubmit) {
      resetForm()
    }
    setViewMode(!viewMode)
  }

  const addForm = () => {
    const tempFormLength = formLength + 1
    setFormLength(tempFormLength)
    setFormValues([...formValues, generateFormValues(tempFormLength)])
    setErrors([...errors, {}])
  }

  const removeForm = (removeIndex = formLength - 1) => {
    const tempFormLength = formLength - 1
    const tempFormVals = formValues.filter((_, i) => i !== removeIndex)
    const tempErrors = errors.filter((_, i) => i !== removeIndex)

    setFormLength(tempFormLength)
    setFormValues(tempFormVals)
    setErrors(tempErrors)
  }

  const resetForm = () => {
    setFormLength(formInitialValues.length)
    initForm(formInitialValues.length)
  }

  const clearForm = () => {
    setFormInitialValues([{}])
    let tempFormValues: any = [{}]
    for (const inputKey of Object.keys(ezSchema.inputs)) {
      tempFormValues[0][inputKey] = ''
    }

    setFormLength(1)
    setFormValues(tempFormValues)
  }

  const _getValueAsString = (keyName: string, index: number) => {
    if (formValues[index][keyName] || formValues[index][keyName] === false) {
      return String(formValues[index][keyName]);
    }
    return String(viewModeFallbackText);
  };

  const updateFormValues = (values) => {
    if (Array.isArray(values)) {
      setFormValues(values)
    } else {
      setFormValues([values])
    }
  }

  return {
    inputs,
    form,
    formValues,
    errors,
    formLength,
    ezSchema,
    updateFormValues,
    updateSchema,
    addForm,
    removeForm,
    resetForm,
    clearForm,
    toggleViewMode,
    viewModeState: viewMode,
    formReady,
    submitButton: !viewMode && submitButton
  }
}