"use client"

import { useActionState } from "react"
import { login, logout } from "./actions"

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null)

  return (
    <div className="mx-auto flex min-h-80 max-w-sm items-center px-4">
      <div className="w-full rounded-xl border border-border bg-card p-6">
        <h1 className="mb-1 text-lg font-semibold">Admin Access</h1>
        <p className="mb-6 text-sm text-muted">Enter the admin API key to continue.</p>
        <form action={formAction} className="flex flex-col gap-3">
          <input
            name="key"
            type="password"
            placeholder="API key"
            required
            autoFocus
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
          {state?.error && (
            <p className="text-xs text-red-500">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {pending ? "Checking..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-xs text-muted underline transition hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  )
}
