import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerStudent } from './actions'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { registerRateLimiter } from '@/lib/ratelimit'
import { sendEmail } from '@/lib/email'
import { createSession, hashPassword } from '@/lib/auth'
import { generateOTP } from '@/lib/otp'
import { mockDeep, mockReset } from 'vitest-mock-extended'

// Mock dependencies
vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended')
  return {
    prisma: mockDeep(),
  }
})

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/ratelimit', () => ({
  registerRateLimiter: {
    check: vi.fn(),
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  EmailTemplates: {
    otpVerification: vi.fn((otp) => `OTP: ${otp}`),
  },
}))

vi.mock('@/lib/auth', () => ({
  createSession: vi.fn(),
  hashPassword: vi.fn((pwd) => Promise.resolve(`hashed_${pwd}`)),
}))

vi.mock('@/lib/otp', () => ({
  generateOTP: vi.fn(() => '123456'),
}))

describe('registerStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReset(prisma)

    // Default mocks
    vi.mocked(headers).mockReturnValue({
      get: vi.fn().mockReturnValue('127.0.0.1'),
    } as any)
    vi.mocked(registerRateLimiter.check).mockReturnValue(true)
  })

  const validFormData = new FormData()
  validFormData.append('email', 'test@example.com')
  validFormData.append('password', 'password123')
  validFormData.append('fullName', 'Test User')
  validFormData.append('country', 'USA')
  validFormData.append('gender', 'Male')
  validFormData.append('ageGroup', '21-25')

  it('should return validation errors for invalid data', async () => {
    const formData = new FormData()
    formData.append('email', 'invalid-email')

    const result = await registerStudent(formData)

    expect(result).toHaveProperty('error')
    // Zod error format verification
    // Since result.error can be a string or an object, we need to be careful.
    // In validation failure it returns validation.error.flatten().fieldErrors which is an object.
    expect(typeof result.error).toBe('object')
    if (typeof result.error === 'object') {
        expect(result.error).toHaveProperty('email')
        expect(result.error).toHaveProperty('password')
    }
  })

  it('should detect spam if website_url is present (Honeypot)', async () => {
    const formData = new FormData()
    // Append valid data first
    for (const [key, value] of (validFormData as any).entries()) {
      formData.append(key, value as string)
    }
    // Add honeypot
    formData.append('website_url', 'http://spam.com')

    const result = await registerStudent(formData)

    expect(result).toEqual({
      error: {
        website_url: ['Spam detected'],
      },
    })
  })

  it('should return error if rate limit is exceeded', async () => {
    vi.mocked(registerRateLimiter.check).mockReturnValue(false)

    const result = await registerStudent(validFormData)

    expect(result).toEqual({ error: 'Too many registration attempts. Please try again later.' })
  })

  it('should return error if user already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing-id', email: 'test@example.com' } as any)

    const result = await registerStudent(validFormData)

    expect(result).toEqual({ error: 'User already exists' })
  })

  it('should register a new student successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'new-user-id' } as any)

    try {
        await registerStudent(validFormData)
    } catch (e) {
        // redirect throws an error in Next.js environment usually (NEXT_REDIRECT),
        // but here we mocked it. If it was real next/navigation redirect, it would throw.
        // Since we mocked it as vi.fn(), it won't throw.
    }

    // Verify DB creation
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'ACTIVE',
        otpCode: '123456',
        password: 'hashed_password123',
        studentProfile: expect.objectContaining({
          create: expect.objectContaining({
            fullName: 'Test User',
            country: 'USA',
          }),
        }),
      }),
    })

    // Verify Email sent
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Verify your EduMeetup Email',
      html: expect.stringContaining('123456'),
    })

    // Verify Session creation
    expect(createSession).toHaveBeenCalledWith('test@example.com', 'STUDENT')

    // Verify Redirect
    expect(redirect).toHaveBeenCalledWith('/verify-email?email=test%40example.com')
  })
})
