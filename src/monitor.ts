import cron from 'node-cron';
import axios from 'axios';
import { getDb } from './database';
import { sendAlert } from './alerts';
import net from 'net';
import https from 'https';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function checkHttp(monitor: any): Promise<{ status: number, latency: number }> {
    const start = Date.now();
    try {
        const res = await axios.get(monitor.url, {
            timeout: 30000, // Increased to 30s
            httpsAgent: agent,
            headers: {
                // Mimic genuine browser to avoid blocking
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        return { status: res.status, latency: Date.now() - start };
    } catch (error: any) {
        const latency = Date.now() - start;
        const status = error.response ? error.response.status : 0;

        // Extended logging for debugging
        console.error(`[CHECK FAILED] ${monitor.url} | Status: ${status} | Latency: ${latency}ms`);
        if (error.code) console.error(`[ERROR CODE] ${error.code}`);
        if (error.message) console.error(`[ERROR MSG] ${error.message}`);

        return { status, latency };
    }
}

async function checkKeyword(monitor: any): Promise<{ status: number, latency: number }> {
    const start = Date.now();
    try {
        const res = await axios.get(monitor.url, { timeout: 10000 });
        if (typeof res.data === 'string' && res.data.includes(monitor.keyword)) {
            return { status: 200, latency: Date.now() - start };
        } else {
            // Keyword not found = 409 Conflict (custom code for failure)
            console.error(`Keyword "${monitor.keyword}" not found on ${monitor.url}`);
            return { status: 409, latency: Date.now() - start };
        }
    } catch (error: any) {
        return {
            status: error.response ? error.response.status : 0,
            latency: Date.now() - start
        };
    }
}

async function checkPort(monitor: any): Promise<{ status: number, latency: number }> {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();

        socket.setTimeout(2000); // 2s timeout for port

        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ status: 200, latency });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ status: 0, latency: 2000 });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({ status: 0, latency: Date.now() - start });
        });

        // Parse/fallback host
        let host = monitor.url.replace('https://', '').replace('http://', '').split('/')[0];
        socket.connect(monitor.port, host);
    });
}

export async function checkSite(monitor: any) {
    const db = await getDb();
    let result = { status: 500, latency: 0 };
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            // Wait before retry (exponential backoff: 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            console.log(`[RETRY] ${monitor.name} (${monitor.url}) - Attempt ${attempt + 1}`);
        }

        if (monitor.type === 'port') {
            result = await checkPort(monitor);
        } else if (monitor.type === 'keyword') {
            result = await checkKeyword(monitor);
        } else {
            result = await checkHttp(monitor);
        }

        // If successful, stop retrying
        if (result.status === 200) {
            break;
        }
    }

    const { status, latency } = result;

    const timestamp = new Date().toISOString();

    // Log to DB
    await db.run(
        `INSERT INTO checks (monitor_id, status, latency, timestamp) VALUES (?, ?, ?, ?)`,
        [monitor.id, status, latency, timestamp]
    );

    // State Change Detection
    const isUp = status === 200;
    const wasUp = monitor.last_check_status === 200;
    const isFirstCheck = monitor.last_check_status === null;

    // Alert if:
    // 1. Status changed (UP -> DOWN or DOWN -> UP)
    // 2. OR It's the first check and it's DOWN (immediate alert for broken sites)
    if ((!isFirstCheck && isUp !== wasUp) || (isFirstCheck && !isUp)) {
        await sendAlert(monitor.name, monitor.url, status, isUp);
    }

    // Update Monitor State
    await db.run(
        `UPDATE monitors SET last_check_status = ?, last_check_latency = ?, last_check_time = ? WHERE id = ?`,
        [status, latency, timestamp, monitor.id]
    );
}

export function startMonitoring() {
    console.log('Starting monitoring engine...');
    cron.schedule('* * * * *', async () => {
        const db = await getDb();
        const monitors = await db.all('SELECT * FROM monitors WHERE active = 1');

        // console.log(`Running checks for ${monitors.length} sites...`);
        for (const monitor of monitors) {
            checkSite(monitor);
        }
    });
}
