'use client'

import { cn } from "@/lib/utils"

type FormStepperProps = {
  steps: { title: string; description?: string }[]
  currentStep: number
}

export function FormStepper({ steps, currentStep }: FormStepperProps) {
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {steps.map((step, index) => {
        const completed = index < currentStep
        const isActive = index === currentStep

        return (
          <li
            key={step.title}
            className={cn(
              "flex flex-col rounded-2xl border px-4 py-2 text-xs uppercase tracking-[0.3em] transition-all sm:flex-1 sm:text-left",
              completed
                ? "border-emerald-400/70 bg-emerald-500/5 text-emerald-300"
                : isActive
                ? "border-primary/60 bg-primary/5 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground/80"
            )}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="text-[0.65rem] font-semibold">{String(index + 1).padStart(2, "0")}</span>
            {/* <span className="mt-1 text-sm font-semibold tracking-tight">{step.title}</span>
            {step.description ? (
              <span className="text-[0.65rem] font-normal tracking-tight text-muted-foreground/80">
                {step.description}
              </span>
            ) : null} */}
          </li>
        )
      })}
    </ol>
  )
}
