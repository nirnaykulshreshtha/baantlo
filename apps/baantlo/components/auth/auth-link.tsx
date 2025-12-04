'use client'

/**
 * @file auth-link.tsx
 * @description Convenience wrapper for link-styled buttons within auth screens.
 */

import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AuthLinkProps = {
  href: string
  children: ReactNode
  className?: string
  prefetch?: boolean
}

export function AuthLink({ href, children, className, prefetch }: AuthLinkProps) {
  return (
    <Button
      asChild
      variant="link"
      className={cn("p-0 font-medium", className)}
    >
      <Link href={href} prefetch={prefetch}>
        {children}
      </Link>
    </Button>
  )
}
