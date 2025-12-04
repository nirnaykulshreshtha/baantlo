/**
 * @file page.tsx
 * @description Appearance settings page allowing users to customize theme and layout preferences.
 * Redesigned with modern card-based visual selectors for an enhanced user experience.
 */

import { Paintbrush, Palette, Layout } from "lucide-react"

import {
  ThemeSelectorVisual,
  ThemeVariantSelectorVisual,
  LayoutSelectorVisual,
} from "@/components/settings"
import { PageContainer, PageHeader } from "@/components/layouts/page-structure"
import { AnimatedSection } from "@/components/common/animated"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { logComponentRender } from "@/lib/logging"
import { getLayoutPreference } from "@/lib/preferences/layout-actions"
import { getThemePreference } from "@/lib/preferences/theme-actions"
import { getThemeVariantPreference } from "@/lib/preferences/theme-variant-actions"

/**
 * Appearance settings surface for theme and layout customization.
 * Features modern card-based visual selectors with icons and previews.
 */
export default async function AppearanceSettingsPage() {
  logComponentRender("AppearanceSettingsPage")

  const themePreference = await getThemePreference()
  const themeVariantPreference = await getThemeVariantPreference()
  const layoutPreference = await getLayoutPreference()

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Appearance"
          description="Fine tune how Baantlo looks and feels. Changes apply instantly across the product."
        />
      </AnimatedSection>

      <AnimatedSection
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Paintbrush className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Theme</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ThemeSelectorVisual currentTheme={themePreference} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Color palette</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ThemeVariantSelectorVisual currentVariant={themeVariantPreference} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Layout className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Layout</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <LayoutSelectorVisual currentLayout={layoutPreference} />
          </CardContent>
        </Card>
      </AnimatedSection>
    </PageContainer>
  )
}
