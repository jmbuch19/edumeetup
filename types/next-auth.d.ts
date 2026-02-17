
import NextAuth, { DefaultSession } from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            role: UserRole
            emailVerified: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role: UserRole
        emailVerified: Date | null
    }
}

declare module "next-auth/adapters" {
    interface AdapterUser {
        role: UserRole
        emailVerified: Date | null
    }
}
