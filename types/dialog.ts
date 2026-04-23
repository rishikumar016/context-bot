export type BaseDialogProps = {
  onClose: () => void
  className?: string
}

export type DialogPosition = "center" | "top" | "bottom" | "left" | "right";

export type DialogOptions = {
  maxWidth?: string
  fullScreen?: boolean
  closeOnOverlayClick?: boolean
  preventClose?: boolean
  position?: DialogPosition
  className?: string
  dialogClassName?: string
  showCloseButton?: boolean;
}

export type DialogConfig<T = any> = {
  component: React.ComponentType<T & BaseDialogProps>
  defaultOptions?: DialogOptions
}

export type DialogType =
  | 'logoutDialog'
  

export type DialogState = {
  type: DialogType | null
  props?: Record<string, any>
  options?: DialogOptions
  isOpen: boolean
}
