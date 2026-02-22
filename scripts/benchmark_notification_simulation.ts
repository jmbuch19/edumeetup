
// Simulation Benchmark for Notification Optimization

// Mocks
const DB_LATENCY_MS = 20; // 20ms round trip per query
const EMAIL_LATENCY_MS = 50; // 50ms for email sending

const mockPrisma = {
    notification: {
        create: async (args: any) => {
            await new Promise(resolve => setTimeout(resolve, DB_LATENCY_MS));
            return { id: 'mock-id', ...args.data };
        },
        createMany: async (args: any) => {
            // Batch insert takes roughly 1 round trip + small overhead
            await new Promise(resolve => setTimeout(resolve, DB_LATENCY_MS * 1.5));
            return { count: args.data.length };
        }
    }
};

const mockSendEmail = async (payload: any) => {
    await new Promise(resolve => setTimeout(resolve, EMAIL_LATENCY_MS));
    return { success: true };
};

// --- Original Implementation (Simulated) ---

interface NotificationPayload {
    userId: string
    type: string
    title: string
    message: string
    payload?: any
    emailTo?: string
    emailSubject?: string
    emailHtml?: string
}

async function createNotificationOriginal(data: NotificationPayload) {
    try {
        // 1. DB Notification
        await mockPrisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                payload: data.payload || {}
            }
        })

        // 2. Email Notification (Optional)
        if (data.emailTo && data.emailSubject && data.emailHtml) {
            await mockSendEmail({
                to: data.emailTo,
                subject: data.emailSubject,
                html: data.emailHtml
            })
        }
    } catch (error) {
        console.error(`Failed to send notification (${data.type}):`, error)
    }
}

// --- Optimized Implementation (Simulated) ---

async function createNotificationsOptimized(dataList: NotificationPayload[]) {
    // 1. DB Notifications (Batch)
    if (dataList.length > 0) {
        await mockPrisma.notification.createMany({
            data: dataList.map(d => ({
                userId: d.userId,
                type: d.type,
                title: d.title,
                message: d.message,
                payload: d.payload || {}
            }))
        })
    }

    // 2. Email Notifications (Parallel)
    const emailPromises = dataList
        .filter(d => d.emailTo && d.emailSubject && d.emailHtml)
        .map(d => mockSendEmail({
            to: d.emailTo!,
            subject: d.emailSubject!,
            html: d.emailHtml!
        }))

    await Promise.allSettled(emailPromises)
}

// --- Main Benchmark ---

async function main() {
    console.log("Starting Simulation Benchmark...");
    console.log(`Parameters: DB Latency = ${DB_LATENCY_MS}ms, Email Latency = ${EMAIL_LATENCY_MS}ms`);

    const PARTICIPANT_COUNT = 50;
    const notificationsData: NotificationPayload[] = Array.from({ length: PARTICIPANT_COUNT }, (_, i) => ({
        userId: `user-${i}`,
        type: 'MEETING_INVITE',
        title: 'Benchmark Meeting',
        message: 'You are invited',
        payload: { meetingId: 'bench-meeting-id' },
        emailTo: `user-${i}@test.com`,
        emailSubject: 'Benchmark Invite',
        emailHtml: '<p>Hello</p>'
    }));

    console.log(`Simulating for ${PARTICIPANT_COUNT} participants.`);

    // Baseline
    console.log("\nRunning Baseline (Sequential Loop)...");
    const startBaseline = performance.now();
    for (const data of notificationsData) {
        await createNotificationOriginal(data);
    }
    const endBaseline = performance.now();
    const baselineTime = endBaseline - startBaseline;
    console.log(`Baseline took: ${baselineTime.toFixed(2)}ms`);

    // Optimized
    console.log("\nRunning Optimized (Batch DB + Parallel Email)...");
    const startOptimized = performance.now();
    await createNotificationsOptimized(notificationsData);
    const endOptimized = performance.now();
    const optimizedTime = endOptimized - startOptimized;
    console.log(`Optimized took: ${optimizedTime.toFixed(2)}ms`);

    // Results
    console.log("\n--- Results ---");
    console.log(`Baseline: ${baselineTime.toFixed(2)}ms`);
    console.log(`Optimized: ${optimizedTime.toFixed(2)}ms`);
    const improvement = ((baselineTime - optimizedTime) / baselineTime) * 100;
    console.log(`Improvement: ${improvement.toFixed(2)}% faster`);
    console.log(`Estimated DB Calls: Baseline=${PARTICIPANT_COUNT}, Optimized=1`);
    console.log(`Email Sending: Baseline=Sequential, Optimized=Parallel`);
}

main().catch(console.error);
