import type { DefaultSession } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

// Define the role union locally — Prisma's UserRole enum doesn't include ADMIN
// (role is stored as a plain String in the DB for the admin account).
export type AppRole = "ADMIN" | "UNIVERSITY" | "STUDENT"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: AppRole
            emailVerified: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role: AppRole
        emailVerified: Date | null
    }
}

declare module "next-auth/adapters" {
    interface AdapterUser {
        role: AppRole
        emailVerified: Date | null
    }
}

// JWT augmentation — allows jwt() callback to set token.role without @ts-ignore
declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id?: string
        role?: AppRole
        lastRefreshed?: number
    }
}
