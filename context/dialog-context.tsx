'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { DialogOptions, DialogState, DialogType } from '@/types/dialog'

type DialogContextType<T = any> = {
  state: DialogState
  openDialog: (
    type: DialogType,
    props?: Record<string, any>,
    options?: DialogOptions
  ) => void
  closeDialog: () => void
  updateDialogProps: (props: Record<string, any>) => void
  dialogData: T
}

const DialogContext = createContext<DialogContextType | null>(null)

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    type: null,
    isOpen: false,
    props: {},
    options: {},
  })

  const openDialog = useCallback(
    (
      type: DialogType,
      props: Record<string, any> = {},
      options: DialogOptions = {}
    ) => {
      setState({
        type,
        props,
        options,
        isOpen: true,
      })
    },
    []
  )

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    // Clean up state after animation
    setTimeout(() => {
      setState({ type: null, isOpen: false, props: {}, options: {} })
    }, 0)
  }, [])

  const updateDialogProps = useCallback((props: Record<string, any>) => {
    setState((prev) => ({
      ...prev,
      props: { ...prev.props, ...props },
    }))
  }, [])

  return (
    <DialogContext.Provider
      value={{
        state,
        openDialog,
        closeDialog,
        updateDialogProps, 
        dialogData: {},
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

export function useDialog<T = any>() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return {
    ...context,
    dialogData: context.state.props as T,
  }
}
