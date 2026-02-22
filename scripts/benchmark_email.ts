
async function mockSendEmail(payload: any) {
    // Simulate network latency of 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
}

async function runBenchmark() {
    const itemCount = 50;
    const interests = Array.from({ length: itemCount }, (_, i) => ({
        student: { user: { email: `student${i}@example.com` } }
    }));

    // --- Sequential Benchmark ---
    console.log(`Starting sequential benchmark with ${interests.length} items (100ms per item)...`);
    const startSeq = performance.now();

    for (const interest of interests) {
        await mockSendEmail({
            to: interest.student.user.email,
            subject: "Test",
            html: "<p>Test</p>"
        });
    }

    const endSeq = performance.now();
    const durationSeq = endSeq - startSeq;
    console.log(`Sequential execution took: ${durationSeq.toFixed(2)}ms`);

    // --- Optimized Benchmark ---
    const BATCH_SIZE = 5;
    console.log(`Starting optimized benchmark (concurrency: ${BATCH_SIZE})...`);
    const startOpt = performance.now();

    for (let i = 0; i < interests.length; i += BATCH_SIZE) {
        const batch = interests.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(interest =>
            mockSendEmail({
                to: interest.student.user.email,
                subject: "Test",
                html: "<p>Test</p>"
            })
        ));
    }

    const endOpt = performance.now();
    const durationOpt = endOpt - startOpt;
    console.log(`Optimized execution took: ${durationOpt.toFixed(2)}ms`);

    const improvement = ((durationSeq - durationOpt) / durationSeq * 100).toFixed(2);
    console.log(`Improvement: ${improvement}% faster`);
}

runBenchmark();
