'use client'
import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
}

interface State { hasError: boolean; error?: Error }

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error(
      `[${this.props.name ?? 'Component'}]`, error
    )
    Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-xl border border-[#E8EAF6] bg-[#F0F2FF] p-4 text-center">
          <p className="font-jakarta text-sm text-[#888888]">
            This section is temporarily unavailable.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-[#C9A84C] hover:underline font-jakarta"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
