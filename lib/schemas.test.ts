import { registerStudentSchema } from './schemas';

describe('registerStudentSchema', () => {
  const validData = {
    email: 'test@example.com',
    password: 'password123',
    fullName: 'John Doe',
    country: 'USA',
    gender: 'Male',
    ageGroup: '18-24',
    // Optional fields can be omitted
  };

  describe('Happy Path', () => {
    it('should validate valid data with only required fields', () => {
      const result = registerStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid data with optional fields', () => {
      const dataWithOptional = {
        ...validData,
        phoneNumber: '1234567890',
        currentStatus: 'Student',
        fieldOfInterest: 'Computer Science',
        preferredDegree: 'Bachelor',
        budgetRange: '10000-20000',
        englishTestType: 'IELTS',
        englishScore: '7.0',
        preferredIntake: 'Fall 2024',
        preferredCountries: 'UK, Canada'
      };
      const result = registerStudentSchema.safeParse(dataWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should fail with invalid email', () => {
      const data = { ...validData, email: 'invalid-email' };
      const result = registerStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        // console.log(JSON.stringify(issue, null, 2));
        expect(issue.message).toBe("Invalid email address");
      }
    });

    it('should fail with short password', () => {
      const data = { ...validData, password: 'short' };
      const result = registerStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Password must be at least 8 characters");
      }
    });

    it('should fail with short name', () => {
      const data = { ...validData, fullName: 'J' };
      const result = registerStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name too short");
      }
    });

    it('should fail with missing required fields', () => {
        const { email, ...missingEmail } = validData;
        const result = registerStudentSchema.safeParse(missingEmail);
        expect(result.success).toBe(false);
    });
  });

  describe('Honeypot Logic', () => {
    it('should fail if honeypot (website_url) is populated', () => {
      const data = { ...validData, website_url: 'http://spam.com' };
      const result = registerStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      // The error might come from either side of the OR, but usually Zod reports issues.
      // Since it's an OR, Zod will return a union error or similar.
      // But let's just check success is false.
    });

    it('should pass if honeypot is empty string', () => {
      const data = { ...validData, website_url: '' };
      const result = registerStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should pass if honeypot is undefined', () => {
      const data = { ...validData }; // website_url is undefined
      const result = registerStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
