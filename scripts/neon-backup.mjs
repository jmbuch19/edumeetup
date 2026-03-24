import https from 'https';

const API_KEY = process.env.NEON_API_KEY;
const PROJECT_ID = process.env.NEON_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
    console.warn('[neon-backup] ⚠️ NEON_API_KEY or NEON_PROJECT_ID not found. Skipping backup branch creation.');
    process.exit(0);
}

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function run() {
    try {
        const branchName = `pre-deploy-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        console.log(`[neon-backup] Creating backup branch: ${branchName}`);

        // 1. Create the branch
        const createRes = await fetch(`https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                branch: {
                    name: branchName
                }
            })
        });

        console.log(`[neon-backup] ✅ Backup branch created: ${branchName}`);
        console.log(`[neon-backup] Restore at: https://console.neon.tech/app/projects/${PROJECT_ID}/branches`);

        // 2. Fetch all branches to clean up old ones
        const branches = await fetch(`https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const allBranches = branches.branches || [];
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        const oldBackups = allBranches.filter(b =>
            b.name.startsWith('pre-deploy-backup-') &&
            new Date(b.created_at).getTime() < sevenDaysAgo
        );

        // 3. Delete old branches
        for (const branch of oldBackups) {
            await fetch(`https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches/${branch.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'application/json'
                }
            });
            console.log(`[neon-backup] Deleted old branch: ${branch.name}`);
        }

    } catch (error) {
        console.error('[neon-backup] ❌ Primary backup failed:', error.message);
        // Fail the build if the backup fails, per "No backup -> no migration".
        process.exit(1);
    }
}

run();
