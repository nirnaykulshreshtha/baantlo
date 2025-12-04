/**
 * @file page.tsx
 * @description Premium home page for Baant Lo - A sophisticated, product-quality landing page
 * featuring animations, interactive elements, and modern design patterns.
 */

"use client"

import Link from "next/link"
import { 
  Users, 
  Receipt, 
  Calculator, 
  Wallet, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Smartphone,
  BarChart3,
  CreditCard,
  Clock,
  Star,
  ChevronRight,
  Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import BrandLogo from "@/components/common/brand-logo"
import { logComponentRender } from "@/lib/logging"
import { motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

/**
 * Premium home page component with sophisticated animations and design.
 */
export default function HomePage() {
  logComponentRender("HomePage")
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  
  useEffect(() => {
    setMounted(true)
    
    // Set up scroll listener after mount
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = window.scrollY
        const elementTop = containerRef.current.offsetTop
        const elementHeight = containerRef.current.offsetHeight
        const windowHeight = window.innerHeight
        
        const progress = Math.min(
          Math.max((scrollTop - elementTop + windowHeight) / (elementHeight + windowHeight), 0),
          1
        )
        setScrollProgress(progress)
      }
    }
    
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial call
    
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Calculate opacity and y based on scroll progress
  const opacity = mounted ? Math.max(0, 1 - scrollProgress * 2) : 1
  const y = mounted ? -scrollProgress * 50 : 0

  const features = [
    {
      icon: Users,
      title: "Smart Group Management",
      description: "Create groups instantly, invite friends via email or phone. Set up recurring expenses and automate settlements.",
      color: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500",
    },
    {
      icon: Receipt,
      title: "Receipt Capture",
      description: "Upload receipts, add descriptions, and categorize expenses. Smart OCR extracts amounts automatically.",
      color: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-500",
    },
    {
      icon: Calculator,
      title: "Intelligent Splitting",
      description: "Split equally, by amount, percentage, or custom ratios. Multi-currency support with real-time conversion.",
      color: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-500",
    },
    {
      icon: Wallet,
      title: "Real-time Balances",
      description: "See who owes what instantly. Track individual and group balances with beautiful visualizations.",
      color: "from-orange-500/20 to-amber-500/20",
      iconColor: "text-orange-500",
    },
    {
      icon: CheckCircle2,
      title: "One-Click Settlements",
      description: "Settle up with a single tap. Track payment history and generate settlement reports.",
      color: "from-indigo-500/20 to-violet-500/20",
      iconColor: "text-indigo-500",
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "End-to-end encryption, secure authentication, and privacy controls. Your data stays yours.",
      color: "from-red-500/20 to-rose-500/20",
      iconColor: "text-red-500",
    },
  ]

  const stats = [
    { value: "50K+", label: "Active Users" },
    { value: "₹2M+", label: "Expenses Tracked" },
    { value: "10K+", label: "Groups Created" },
    { value: "99.9%", label: "Uptime" },
  ]

  const useCases = [
    {
      title: "Roommates",
      description: "Split rent, utilities, groceries, and household expenses seamlessly.",
      icon: Users,
    },
    {
      title: "Friends & Trips",
      description: "Track travel expenses, restaurant bills, and shared activities.",
      icon: Globe,
    },
    {
      title: "Colleagues",
      description: "Split team lunches, office supplies, and group project costs.",
      icon: Smartphone,
    },
  ]

  if (!mounted) {
    return null
  }

  return (
    <main
      ref={containerRef}
      id="main-content"
      className="flex min-h-screen flex-col bg-background focus:outline-none"
      tabIndex={-1}
    >
      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen overflow-hidden border-b">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
          <div className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl animate-pulse delay-1000" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        <motion.div 
          style={{ opacity, y }}
          className="container relative mx-auto px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-5xl text-center">
            {/* Logo with Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-card/80 backdrop-blur-sm shadow-2xl"
              >
                <BrandLogo className="h-12 w-12" />
              </motion.div>
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-sm backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Trusted by thousands of users</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
            >
              Split expenses
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                effortlessly
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground sm:text-2xl"
            >
              The smartest way to split bills, track shared expenses, and settle up with friends.
              <br />
              <span className="text-lg">No more awkward money conversations.</span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button asChild size="lg" className="group h-14 px-8 text-lg shadow-lg">
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg backdrop-blur-sm">
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm"
            >
              {[
                { icon: CheckCircle2, text: "Free forever" },
                { icon: Shield, text: "Secure & private" },
                { icon: Zap, text: "Lightning fast" },
                { icon: Globe, text: "Multi-currency" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="border-b bg-muted/30 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-2 text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need
              <br />
              <span className="text-muted-foreground">to split expenses</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Powerful features designed to make expense splitting simple, fast, and stress-free.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <Card className="group h-full border-2 transition-all hover:shadow-xl">
                    <CardHeader>
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} transition-transform group-hover:scale-110`}>
                        <Icon className={`h-7 w-7 ${feature.iconColor}`} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="border-y bg-gradient-to-b from-muted/50 to-background py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 text-center"
            >
              <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Perfect for everyone
              </h2>
              <p className="text-xl text-muted-foreground">
                Whether you're splitting rent or planning a trip
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-3">
              {useCases.map((useCase, index) => {
                const Icon = useCase.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Card className="group h-full border-2 transition-all hover:border-primary/50 hover:shadow-lg">
                      <CardHeader>
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl">{useCase.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base">
                          {useCase.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              How it works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get started in minutes. No complicated setup required.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Create a group",
                description: "Start by creating a group and inviting your friends, roommates, or colleagues. Set up your group currency and preferences.",
                icon: Users,
              },
              {
                step: "2",
                title: "Add expenses",
                description: "Record expenses with descriptions, amounts, and receipts. Choose how to split them—equally, by amount, or by percentage.",
                icon: Receipt,
              },
              {
                step: "3",
                title: "Track balances",
                description: "See who owes what at a glance. Our system automatically calculates everything and shows real-time balances.",
                icon: BarChart3,
              },
              {
                step: "4",
                title: "Settle up",
                description: "Mark expenses as paid and keep your group finances organized. Generate settlement reports and track payment history.",
                icon: CheckCircle2,
              },
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 8 }}
                  className="group flex gap-6 rounded-xl border-2 bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex shrink-0 items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xl font-bold shadow-lg">
                      {item.step}
                    </div>
                    <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-2xl font-semibold">{item.title}</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="border-t bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-2xl">
                <CardHeader className="text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="mb-6 flex justify-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
                      <Sparkles className="h-10 w-10" />
                    </div>
                  </motion.div>
                  <CardTitle className="mb-4 text-4xl font-bold sm:text-5xl">
                    Ready to simplify your expense splitting?
                  </CardTitle>
                  <CardDescription className="text-xl">
                    Join thousands of users who trust Baant Lo to manage their shared expenses.
                    <br />
                    Get started today—it's free forever.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" className="h-14 px-8 text-lg shadow-lg">
                    <Link href="/register">
                      Create Your Free Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg">
                    <Link href="/login">
                      Sign In
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
      </div>
      </section>
    </main>
  )
}
