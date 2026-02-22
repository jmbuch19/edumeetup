import { loginSchema } from '../schemas';

describe('loginSchema', () => {
    it('should validate valid email and password', () => {
        const validData = {
            email: 'test@example.com',
            password: 'password123'
        };
        const result = loginSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
        const invalidData = {
            email: 'invalid-email',
            password: 'password123'
        };
        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Invalid email address");
        }
    });

    it('should fail with empty password', () => {
        const invalidData = {
            email: 'test@example.com',
            password: ''
        };
        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Password is required");
        }
    });

    it('should fail when fields are missing', () => {
        const missingEmail = {
            password: 'password123'
        } as unknown;

        const result1 = loginSchema.safeParse(missingEmail);
        expect(result1.success).toBe(false);

        const missingPassword = {
            email: 'test@example.com'
        } as unknown;
        const result2 = loginSchema.safeParse(missingPassword);
        expect(result2.success).toBe(false);
    });

    it('should strip unknown fields', () => {
       const extraData = {
            email: 'test@example.com',
            password: 'password123',
            extra: 'field'
        };
        const result = loginSchema.safeParse(extraData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).not.toHaveProperty('extra');
            expect(result.data).toEqual({
                email: 'test@example.com',
                password: 'password123'
            });
        }
    });
});
