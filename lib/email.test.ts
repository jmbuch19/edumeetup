import { EmailTemplates } from './email';

// Mock nodemailer to avoid side effects during import
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

describe('EmailTemplates', () => {
  describe('universityInterest', () => {
    it('should generate correct HTML with student details', () => {
      const studentName = 'John Doe';
      const studentEmail = 'john@example.com';
      const message = 'I am interested in your program.';

      const html = EmailTemplates.universityInterest(studentName, studentEmail, message);

      expect(html).toContain(studentName);
      expect(html).toContain(studentEmail);
      expect(html).toContain(message);
      expect(html).toContain('<h2>New Student Interest!</h2>');
    });
  });

  describe('verificationStatus', () => {
    it('should generate correct HTML for VERIFIED status', () => {
      const status = 'VERIFIED';
      const institutionName = 'Test University';

      const html = EmailTemplates.verificationStatus(status, institutionName);

      expect(html).toContain(`Verification Update for ${institutionName}`);
      expect(html).toContain(`Your university profile has been <strong>${status}</strong>`);
      expect(html).toContain('You now have full access to student data');
    });

    it('should generate correct HTML for REJECTED status', () => {
      const status = 'REJECTED';
      const institutionName = 'Test University';

      const html = EmailTemplates.verificationStatus(status, institutionName);

      expect(html).toContain(`Verification Update for ${institutionName}`);
      expect(html).toContain(`Your university profile has been <strong>${status}</strong>`);
      expect(html).toContain('Please contact support for more information');
    });
  });
});
