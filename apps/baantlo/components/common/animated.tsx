"use client"

/**
 * @file animated.tsx
 * @description Lightweight wrappers around Framer Motion primitives that can be consumed by Server Components.
 */

import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"

export function AnimatedSection(props: HTMLMotionProps<"section">) {
  return <motion.section {...props} />
}

export function AnimatedDiv(props: HTMLMotionProps<"div">) {
  return <motion.div {...props} />
}

export function AnimatedMain(props: HTMLMotionProps<"main">) {
  return <motion.main {...props} />
}

