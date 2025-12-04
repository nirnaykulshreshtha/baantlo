'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type AuthFormShellProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  maxWidth?: string
}

export function AuthFormShell({
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  maxWidth = "max-w-3xl",
}: AuthFormShellProps) {
  const baseClasses =
    "mx-auto w-full shadow-none"

  return (
    <Card className={cn(baseClasses, maxWidth, className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
        {description ? <CardDescription className="text-muted-foreground/90">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("space-y-6", contentClassName)}>{children}</CardContent>
      {footer ? (
        <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>
      ) : null}
    </Card>
  )
}
