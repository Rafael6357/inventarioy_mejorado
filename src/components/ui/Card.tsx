import * as React from "react"
import { cn } from "../../lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'bordered'
}

const variantClasses = {
  default: 'bg-surface border border-border/50 shadow-sm',
  interactive: 'bg-surface border border-border/50 shadow-sm hover:border-primary/30 hover:shadow-[0_0_20px_-8px_rgba(255,193,7,0.15)] transition-all duration-300 cursor-pointer',
  bordered: 'bg-transparent border border-border',
}

function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...props} />
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn("text-lg font-bold text-text", className)} {...props} />
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("p-6 pt-4", className)} {...props} />
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function CardFooter({ className, ...props }: CardFooterProps) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
