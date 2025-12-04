'use client'

import type { ErrorInfo, ReactNode } from "react"
import { Component } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { resolveAuthError } from "@/lib/auth/errors"
import { logLayoutEvent } from "@/lib/logging"

type AuthErrorBoundaryProps = {
  children: ReactNode
  fallbackMessage?: string
}

type AuthErrorBoundaryState = {
  hasError: boolean
  message: string
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  state: AuthErrorBoundaryState = {
    hasError: false,
    message: this.props.fallbackMessage ?? "Something went wrong while loading the auth flow.",
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    const resolved = resolveAuthError(error)
    return {
      hasError: true,
      message: resolved.message,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logLayoutEvent("Auth", "boundary_error", { message: error.message, info })
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: this.props.fallbackMessage ?? "" })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="flex flex-col gap-3">
          <AlertTitle>Authentication error</AlertTitle>
          <AlertDescription>{this.state.message}</AlertDescription>
          <div>
            <Button type="button" size="sm" onClick={this.handleRetry}>
              Try again
            </Button>
          </div>
        </Alert>
      )
    }

    return this.props.children
  }
}
