import { AuthUser } from "@/lib/auth/types"

declare module "next-auth" {
  interface Session {
    user: AuthUser
    accessToken?: string | null
    refreshToken?: string | null
    accessTokenExpires?: number | null
    error?: string | null
  }

  interface User extends AuthUser {}
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: AuthUser
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string | null
  }
}
