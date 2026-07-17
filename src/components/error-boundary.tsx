"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback !== undefined) return this.props.fallback

    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <p className="text-sm text-muted">Something went wrong rendering this section.</p>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
        >
          Retry
        </button>
      </div>
    )
  }
}

export { ErrorBoundary }
export default ErrorBoundary
