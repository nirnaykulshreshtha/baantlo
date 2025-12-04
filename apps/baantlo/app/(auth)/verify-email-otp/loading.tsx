import { Skeleton } from "@/components/ui/skeleton"

export default function VerifyEmailOtpLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 py-4 sm:px-2 lg:px-2">
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  )
}
