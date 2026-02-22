import { passwordSchema } from '../lib/schemas';

const testCases = [
  { pwd: "weak", expected: false, reason: "Too short" },
  { pwd: "password", expected: false, reason: "Too short (8 chars but no complexity)" }, // Wait, 'password' is 8 chars, but no complexity
  { pwd: "password123", expected: false, reason: "No uppercase, no special" },
  { pwd: "Password123", expected: false, reason: "No special" },
  { pwd: "Password!", expected: false, reason: "No number" },
  { pwd: "StrongP@ssw0rd!", expected: true, reason: "Strong" },
  { pwd: "C0mpl3xity#Rules", expected: true, reason: "Strong" },
  { pwd: "Ab1!", expected: false, reason: "Too short" },
  { pwd: "AAAAAAAA1!", expected: false, reason: "No lowercase" },
  { pwd: "aaaaaaa1!", expected: false, reason: "No uppercase" },
];

async function testPasswordSchema() {
  console.log("Testing Password Schema...");
  let failed = false;

  for (const { pwd, expected, reason } of testCases) {
    const result = passwordSchema.safeParse(pwd);

    if (result.success !== expected) {
      console.error(`[FAIL] Password '${pwd}' (${reason}). Expected success: ${expected}, Got: ${result.success}`);
      if (!result.success) {
          console.error("Errors:", result.error.issues.map(i => i.message));
      }
      failed = true;
    } else {
      console.log(`[PASS] Password '${pwd}' (${reason}). Result: ${result.success}`);
    }
  }

  if (failed) {
      console.error("\nSOME TESTS FAILED");
      process.exit(1);
  } else {
      console.log("\nALL TESTS PASSED");
  }
}

testPasswordSchema();
