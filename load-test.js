const https = require('https');
const http = require('http');

// =========================================================================
// CONFIGURATION
// To test local mock server:     node load-test.js local
// To test live UAT cloud API:    node load-test.js
// To pass an active auth token:  node load-test.js --token YOUR_TOKEN
// =========================================================================

const args = process.argv.slice(2);
const isLocal = args.includes('local');
const tokenArgIndex = args.indexOf('--token');
const userToken = tokenArgIndex !== -1 ? args[tokenArgIndex + 1] : null;

// Target API details
const TARGET_URL = isLocal 
  ? 'http://localhost:5000/webhook/vdadminVideos' 
  : 'https://uat-02-admin-api.darpanx.com/webhook/vdadminVideos';

const parsedUrl = new URL(TARGET_URL);
const isHttps = parsedUrl.protocol === 'https:';
const client = isHttps ? https : http;

const TOTAL_REQUESTS = isLocal ? 100 : 20;  // 20 for cloud, 100 for local
const CONCURRENCY = isLocal ? 20 : 5;      // 5 concurrent users for cloud

const PAYLOAD = JSON.stringify({
  formstep: "getAllVideos"
});

console.log(`\n======================================================`);
console.log(`   LOAD & STRESS TEST BENCHMARK FOR VDADMINVIDEOS`);
console.log(`======================================================`);
console.log(`Target API:         ${TARGET_URL}`);
console.log(`HTTP Method:        POST`);
console.log(`Payload Action:     getAllVideos`);
console.log(`Total Requests:     ${TOTAL_REQUESTS}`);
console.log(`Simulated Users:    ${CONCURRENCY} parallel connections`);
console.log(`Auth Header:        ${userToken ? 'Bearer Token Provided' : (isLocal ? 'Mock Bearer Token' : 'Public Request')}`);
console.log(`======================================================\n`);

let completed = 0;
let success = 0;
let failed = 0;
const statusCodes = {};
const latencies = [];
const overallStartTime = Date.now();

function sendRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(PAYLOAD),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LoadTestBenchmark/1.0'
    };

    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    } else if (isLocal) {
      // Local fallback token for super admin
      try {
        const path = require('path');
        const jwt = require(path.join(__dirname, 'backend-mock', 'node_modules', 'jsonwebtoken'));
        const localToken = jwt.sign(
          { id: 'u-superadmin', email: 'superadmin@stream.com', role: 'super_admin' },
          'super-secret-video-streaming-platform-jwt-token-key-2026',
          { expiresIn: '1d' }
        );
        headers['Authorization'] = `Bearer ${localToken}`;
      } catch (e) {}
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: headers
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        latencies.push(latency);
        statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
        
        // Count 200 as success, and 400 'Not Logged In' as received response
        if (res.statusCode >= 200 && res.statusCode < 400) {
          success++;
        } else {
          failed++;
        }
        completed++;
        process.stdout.write(`\r[Running] ${completed}/${TOTAL_REQUESTS} requests finished...`);
        resolve();
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - startTime;
      latencies.push(latency);
      failed++;
      completed++;
      process.stdout.write(`\r[Running] ${completed}/${TOTAL_REQUESTS} requests finished...`);
      resolve();
    });

    req.setTimeout(15000, () => {
      req.abort();
      failed++;
      completed++;
      resolve();
    });

    req.write(PAYLOAD);
    req.end();
  });
}

async function run() {
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < TOTAL_REQUESTS) {
      currentIndex++;
      await sendRequest();
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const totalTimeSeconds = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  latencies.sort((a, b) => a - b);
  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const p50Latency = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const rps = (TOTAL_REQUESTS / totalTimeSeconds).toFixed(1);

  console.log(`\n\n==================== TEST RESULTS SUMMARY ====================`);
  console.log(`API Target:                 ${TARGET_URL}`);
  console.log(`Payload Action:             formstep: "getAllVideos"`);
  console.log(`Total Requests Processed:   ${TOTAL_REQUESTS}`);
  console.log(`Status Codes:               ${JSON.stringify(statusCodes)}`);
  console.log(`Successful Responses:       ${success} / ${TOTAL_REQUESTS}`);
  console.log(`Total Time Elapsed:         ${totalTimeSeconds} seconds`);
  console.log(`Throughput Rate:            ${rps} requests/second`);
  console.log(`--------------------------------------------------------------`);
  console.log(`Average Latency:            ${avgLatency} ms`);
  console.log(`Median Latency (p50):       ${p50Latency} ms`);
  console.log(`95th Percentile (p95):      ${p95Latency} ms`);
  console.log(`Min Latency:                ${minLatency} ms`);
  console.log(`Max Latency:                ${maxLatency} ms`);
  console.log(`==============================================================\n`);
}

run();
