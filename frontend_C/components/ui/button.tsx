import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { ReactNode } from 'react'

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

type ButtonProps = ButtonPrimitive.Props & {
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  children?: ReactNode
}

function buttonVariants({ variant = 'default', size = 'default', className = '' }: Pick<ButtonProps, 'variant' | 'size' | 'className'> = {}) {
  return ['button', `button--${variant}`, `button--${size}`, className].filter(Boolean).join(' ')
}

function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return <ButtonPrimitive data-slot="button" className={buttonVariants({ variant, size, className })} {...props} />
}

export { Button, buttonVariants }
