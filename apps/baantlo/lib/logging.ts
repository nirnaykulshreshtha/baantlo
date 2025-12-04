/**
 * @file logging.ts
 * @description Provides centralized logging helpers to enforce consistent and verbose diagnostics across the UI layer.
 */

/**
 * Logs a standardized render message for visual components to aid aggressive debugging practices.
 *
 * @param componentName - Human-readable name of the component being rendered.
 * @param context - Optional contextual data that should accompany the log for richer insights.
 */
export function logComponentRender(
  componentName: string,
  context: Record<string, unknown> = {}
): void {
  // Intentionally using console.debug to avoid polluting default logs while still surfacing during verbose tracing sessions.
  console.debug(`[UI:${componentName}] render`, context)
}

/**
 * Emits a namespaced log for layout-level lifecycle insights.
 *
 * @param layoutName - The identifier for the layout emitting the log.
 * @param message - Brief message describing the layout event being captured.
 * @param context - Supplemental information that may clarify the layout state.
 */
export function logLayoutEvent(
  layoutName: string,
  message: string,
  context: Record<string, unknown> = {}
): void {
  console.debug(`[Layout:${layoutName}] ${message}`, context)
}


