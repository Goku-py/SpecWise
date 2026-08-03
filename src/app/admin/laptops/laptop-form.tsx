"use client"

import Link from "next/link"
import { useActionState } from "react"
import { LAPTOP_FIELDS, type LaptopFieldDef } from "@/lib/laptop-fields"
import { createLaptopAction, updateLaptopAction } from "@/app/admin/actions"

interface LaptopFormProps {
  mode: "create" | "edit"
  /** Required when mode === "edit". */
  id?: string
  /** Prefilled values from the DB (see laptopToFormValues). */
  initialValues?: Record<string, string>
}

function FieldControl({ field, initialValue }: { field: LaptopFieldDef; initialValue: string }) {
  const common =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"

  switch (field.type) {
    case "number":
      return (
        <input
          type="number"
          step="any"
          min={0}
          name={field.name}
          defaultValue={initialValue}
          placeholder={field.placeholder}
          required={field.required}
          className={`${common} w-full`}
        />
      )
    case "boolean":
      return (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name={field.name}
            defaultChecked={initialValue === "true"}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          {field.label}
        </label>
      )
    case "select":
      return (
        <select
          name={field.name}
          defaultValue={initialValue}
          required={field.required}
          className={`${common} w-full`}
        >
          <option value="">— Select —</option>
          {(field.options ?? []).map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    case "string-array":
      return (
        <input
          type="text"
          name={field.name}
          defaultValue={initialValue}
          placeholder={field.placeholder}
          className={`${common} w-full`}
        />
      )
    default:
      return (
        <input
          type="text"
          name={field.name}
          defaultValue={initialValue}
          placeholder={field.placeholder}
          required={field.required}
          className={`${common} w-full`}
        />
      )
  }
}

export function LaptopForm({ mode, id, initialValues = {} }: LaptopFormProps) {
  const action =
    mode === "edit"
      ? updateLaptopAction.bind(null, id ?? "")
      : createLaptopAction
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {LAPTOP_FIELDS.map(field => {
          if (field.type === "boolean") {
            return (
              <div key={field.name} className="flex items-center rounded-xl border border-border bg-card px-4 py-3">
                <FieldControl field={field} initialValue={initialValues[field.name] ?? "false"} />
              </div>
            )
          }
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={`laptop-${field.name}`} className="text-sm font-medium text-foreground">
                {field.label}
                {field.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              <div id={`laptop-${field.name}`}>
                <FieldControl field={field} initialValue={initialValues[field.name] ?? ""} />
              </div>
              {field.help && <p className="text-xs text-muted">{field.help}</p>}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create laptop"}
        </button>
        <Link
          href="/admin"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-card-hover hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
