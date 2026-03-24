import { z } from 'zod'

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),
    
    // Authentication
    AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    
    // Email (Resend/SMTP)
    EMAIL_SERVER_HOST: z.string().min(1).optional(),
    EMAIL_SERVER_PORT: z.string().min(1).optional(),
    EMAIL_SERVER_USER: z.string().min(1).optional(),
    EMAIL_SERVER_PASSWORD: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    
    // Infrastructure
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    
    // Third-party APIs
    GROQ_API_KEY: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
})

export const validateEnv = () => {
    const parsed = envSchema.safeParse(process.env)
    
    if (!parsed.success) {
        const missingVars = parsed.error.issues.map(issue => issue.path.join('.')).join(', ')
        console.error(`\n❌ CRITICAL: Invalid or missing environment variables:\n${missingVars}\n`)
        
        // Hard crash the server in production so it never boots in a broken state
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Environment Variable Validation Failed: ${missingVars}`)
        }
    } else {
        console.log('✅ Environment variables validated successfully.')
    }
}
