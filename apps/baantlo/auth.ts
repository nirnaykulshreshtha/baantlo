/**
 * @file auth.ts
 * @description NextAuth v5 configuration bridging the Baant Lo frontend with the FastAPI backend.
 */

import NextAuth, { AuthError } from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { env } from "@/lib/env"
import { login } from "@/lib/auth/api-client"
import { resolveAuthError } from "@/lib/auth/errors"
import { AuthSession, AuthSessionSchema, VerificationFlow } from "@/lib/auth/types"
import { isAccessTokenExpiring, refreshAccessToken } from "@/lib/auth/token-refresh"
import { logLayoutEvent } from "@/lib/logging"

type CredentialsUser = AuthSession["user"] & {
  session: AuthSession
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        session: { label: "Session", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.session && typeof credentials.session === "string") {
          const parsed = AuthSessionSchema.safeParse(JSON.parse(credentials.session))
          if (!parsed.success) {
            throw new AuthError("CredentialsSignin", {
              cause: {
                code: "error",
                message: "Unable to parse cached session payload.",
              },
            })
          }

          const session = parsed.data
          return {
            ...session.user,
            session,
          } satisfies CredentialsUser
        }

        if (!credentials?.email || !credentials?.password) {
          throw new AuthError("CredentialsSignin", {
            cause: { code: "invalid_credentials", message: "Missing credentials." },
          })
        }

        try {
          const email = typeof credentials.email === "string" ? credentials.email : ""
          const password = typeof credentials.password === "string" ? credentials.password : ""
          
          const response = await login({
            email,
            password,
          })

          if (response.action !== "issue_tokens" || !response.session) {
            throw new AuthError("CredentialsSignin", {
              cause: {
                action: response.action,
                email: response.email,
                phone: response.phone,
                message: response.message,
              } satisfies Partial<VerificationFlow>,
            })
          }

          const session = response.session

          logLayoutEvent("Auth", "login_success", {
            userId: session.user.id,
            email: session.user.email,
          })

          return {
            ...session.user,
            session,
          } satisfies CredentialsUser
        } catch (error) {
          const resolved = resolveAuthError(error)
          logLayoutEvent("Auth", "login_failure", {
            code: resolved.code,
            message: resolved.message,
          })

          throw new AuthError("CredentialsSignin", {
            cause: {
              code: resolved.code,
              message: resolved.message,
              detail: resolved.detail,
            },
          })
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const { session: userSession, ...rest } = user as CredentialsUser
        return {
          ...token,
          user: rest,
          accessToken: userSession.access_token,
          refreshToken: userSession.refresh_token,
          accessTokenExpires: Date.now() + userSession.expires_in * 1000,
          error: null,
        }
      }

      if (trigger === "update" && session) {
        return {
          ...token,
          ...session,
        }
      }

      if (!token.refreshToken) {
        return token
      }

      if (!isAccessTokenExpiring(token.accessTokenExpires as number)) {
        return token
      }

      try {
        const refreshed = await refreshAccessToken(token.refreshToken as string)
        return {
          ...token,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          accessTokenExpires: refreshed.accessTokenExpires,
          user: refreshed.session.user,
          error: null,
        }
      } catch (error) {
        const resolved = resolveAuthError(error)
        return {
          ...token,
          error: resolved.code,
        }
      }
    },
    async session({ session, token }) {
      const user = token.user as AuthSession["user"]
      
      return {
        ...session,
        user: {
          ...user,
          emailVerified: user.email_verified ?? null,
        },
        accessToken: token.accessToken as string | undefined,
        refreshToken: token.refreshToken as string | undefined,
        accessTokenExpires: token.accessTokenExpires as number | undefined,
        error: (token.error as string | undefined) ?? null,
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signOut() {
      // Note: In NextAuth v5, signOut event doesn't provide session/token data
      // User data should be logged before signOut is called
      logLayoutEvent("Auth", "signout", {})
    },
  },
  debug: process.env.NODE_ENV !== "production",
})
