"use client"

import { Check, CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

export type OnboardingSectionId =
  | "business"
  | "categories"
  | "markets"
  | "certifications"
  | "documents"
  | "review"
  | "submission"

export type OnboardingSection = {
  id: OnboardingSectionId
  label: string
}

type OnboardingSectionNavProps = {
  sections: readonly OnboardingSection[]
  activeSection: OnboardingSectionId
  completedSections: ReadonlySet<OnboardingSectionId>
  errorSections: ReadonlySet<OnboardingSectionId>
  onSelect: (section: OnboardingSectionId) => void
}

export function OnboardingSectionNav({
  sections,
  activeSection,
  completedSections,
  errorSections,
  onSelect,
}: OnboardingSectionNavProps) {
  return (
    <>
      <div className="overflow-x-auto pb-2 lg:hidden">
        <nav className="flex min-w-max gap-2" aria-label="Onboarding sections">
          {sections.map((section, index) => (
            <SectionButton
              key={section.id}
              compact
              section={section}
              index={index}
              active={activeSection === section.id}
              complete={completedSections.has(section.id)}
              hasError={errorSections.has(section.id)}
              onSelect={onSelect}
            />
          ))}
        </nav>
      </div>

      <aside className="sticky top-8 hidden h-fit rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm lg:block">
        <p className="px-3 pt-1 pb-3 text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
          Onboarding workspace
        </p>
        <nav className="space-y-1" aria-label="Onboarding sections">
          {sections.map((section, index) => (
            <SectionButton
              key={section.id}
              section={section}
              index={index}
              active={activeSection === section.id}
              complete={completedSections.has(section.id)}
              hasError={errorSections.has(section.id)}
              onSelect={onSelect}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}

function SectionButton({
  section,
  index,
  active,
  complete,
  hasError,
  compact = false,
  onSelect,
}: {
  section: OnboardingSection
  index: number
  active: boolean
  complete: boolean
  hasError: boolean
  compact?: boolean
  onSelect: (section: OnboardingSectionId) => void
}) {
  return (
    <button
      type="button"
      aria-current={active ? "step" : undefined}
      onClick={() => onSelect(section.id)}
      className={cn(
        "flex items-center gap-3 rounded-xl text-left text-sm font-medium transition-colors",
        compact ? "px-3 py-2" : "w-full px-3 py-3",
        active
          ? "bg-neutral-950 text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          active
            ? "border-amber-400 bg-amber-400 text-neutral-950"
            : complete
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : hasError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-neutral-200 bg-white text-neutral-600"
        )}
      >
        {hasError ? (
          <CircleAlert className="size-3.5" />
        ) : complete ? (
          <Check className="size-3.5" />
        ) : (
          index + 1
        )}
      </span>
      <span>{section.label}</span>
    </button>
  )
}
