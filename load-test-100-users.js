/**
 * XLurn Video Streaming - 100 Concurrent Users Load & Stress Test
 * ----------------------------------------------------------------
 * Simulates 100 concurrent users simultaneously watching the same video:
 *   1. Streaming video chunks via HTTP Byte-Range requests (Range: bytes=start-end -> HTTP 206)
 *   2. Sending concurrent playback telemetry heartbeats (formStep: 'watchsession' -> POST /vdUser)
 *
 * Usage Examples:
 *   1. Test Video Streaming + Local Backend (Port 5000):
 *      node load-test-100-users.js --mode=local
 *
 *   2. Test Video Streaming Only (100 concurrent video streams):
 *      node load-test-100-users.js --mode=stream-only
 *
 *   3. Test against UAT / Production Webhook API:
 *      node load-test-100-users.js --mode=uat --video="https://www.w3schools.com/html/mov_bbb.mp4"
 *
 *   4. Custom number of users & video URL:
 *      node load-test-100-users.js --users=100 --chunks=4 --video="http://localhost:5000/uploads/video-1783160868201-113435163.mp4"
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Parse CLI arguments (--key=value)
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    acc[k] = v === undefined ? true : v;
  }
  return acc;
}, {});

const MODE = args.mode || process.env.MODE || 'stream-only'; // 'local' | 'uat' | 'stream-only'
const CONCURRENT_USERS = parseInt(args.users || process.env.CONCURRENT_USERS || '100', 10);
const CHUNKS_PER_USER = parseInt(args.chunks || process.env.CHUNKS_PER_USER || '3', 10);
const CHUNK_SIZE_BYTES = parseInt(args.chunkSize || process.env.CHUNK_SIZE_BYTES || String(512 * 1024), 10); // 512 KB

const DEFAULT_VIDEO_URL = MODE === 'local'
  ? 'http://localhost:5000/uploads/video-1783160868201-113435163.mp4'
  : 'https://www.w3schools.com/html/mov_bbb.mp4';

const DEFAULT_API_URL = MODE === 'uat'
  ? 'https://uat-02-admin-api.darpanx.com/webhook/vdUser'
  : (MODE === 'local' ? 'http://localhost:5000/vdUser' : 'none');

const VIDEO_URL = args.video || process.env.VIDEO_URL || DEFAULT_VIDEO_URL;
const API_URL = args.api || process.env.API_URL || DEFAULT_API_URL;
const AUTH_TOKEN = args.token || process.env.AUTH_TOKEN || '';

// Keep-alive agents for realistic browser connection pooling per virtual user
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENT_USERS * 2 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: CONCURRENT_USERS * 2 });

const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  statusCodes: {},
  totalBytesDownloaded: 0,
  latenciesMs: [],
  streamLatenciesMs: [],
  telemetryLatenciesMs: [],
  errors: {}
};

function makeRequest(targetUrl, options = {}, body = null) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (err) {
      resolve({ ok: false, status: 0, latencyMs: 0, bytes: 0, error: 'Invalid URL' });
      return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const reqOptions = {
      method: options.method || 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: options.headers || {},
      agent: isHttps ? httpsAgent : httpAgent,
      timeout: 20000
    };

    const req = client.request(reqOptions, (res) => {
      let bytesReceived = 0;
      res.on('data', (chunk) => {
        bytesReceived += chunk.length;
      });
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1e6;
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          ok,
          status: res.statusCode,
          latencyMs,
          bytes: bytesReceived
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;
      resolve({ ok: false, status: 'TIMEOUT', latencyMs, bytes: 0, error: 'Request Timeout (20s)' });
    });

    req.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;
      resolve({ ok: false, status: 'ERR', latencyMs, bytes: 0, error: err.code || err.message });
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function recordMetric(res, type = 'stream') {
  metrics.totalRequests++;
  if (res.ok) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
    const errKey = res.error || `HTTP_${res.status}`;
    metrics.errors[errKey] = (metrics.errors[errKey] || 0) + 1;
  }
  metrics.statusCodes[res.status] = (metrics.statusCodes[res.status] || 0) + 1;
  metrics.totalBytesDownloaded += res.bytes || 0;
  metrics.latenciesMs.push(res.latencyMs);
  if (type === 'stream') {
    metrics.streamLatenciesMs.push(res.latencyMs);
  } else {
    metrics.telemetryLatenciesMs.push(res.latencyMs);
  }
}

async function simulateSingleUser(userIndex) {
  const userId = `loadtest-user-${userIndex}`;
  const videoId = args.videoId || process.env.VIDEO_ID || '1';

  for (let chunkIdx = 0; chunkIdx < CHUNKS_PER_USER; chunkIdx++) {
    const startByte = chunkIdx * CHUNK_SIZE_BYTES;
    const endByte = startByte + CHUNK_SIZE_BYTES - 1;

    // 1. Simulate HTML5 <video> HTTP Byte-Range Stream Request
    const streamRes = await makeRequest(VIDEO_URL, {
      method: 'GET',
      headers: {
        'Range': `bytes=${startByte}-${endByte}`,
        'User-Agent': `XLurn-LoadTester/1.0 (VirtualUser ${userIndex})`,
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    });
    recordMetric(streamRes, 'stream');

    // 2. Simulate VideoWatch.js 'watchsession' Telemetry Heartbeat
    if (API_URL && API_URL !== 'none') {
      const watchPosSec = (chunkIdx + 1) * 10;
      const telemetryPayload = {
        formStep: 'watchsession',
        id: videoId,
        videoid: videoId,
        videoId: videoId,
        course_id: 1,
        chapter_id: 1,
        lastPosition: watchPosSec,
        lastPositionTime: `00:${String(watchPosSec).padStart(2, '0')}`,
        duration: '05:20',
        isNewSession: chunkIdx === 0,
        watchTime: '00:10',
        pausedCount: 0,
        forwardedCount: 0,
        backwardCount: 0,
        device_type: 'web',
        platform: 'Win32',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        watch_duration_sec: 10,
        video_duration_sec: 320,
        status: chunkIdx === CHUNKS_PER_USER - 1,
        completion_percentage: Math.min(100, Math.round((watchPosSec / 320) * 100)),
        playback_speed: 1,
        quality: '1080p',
        user_id: userId
      };

      const telemetryRes = await makeRequest(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
          }
        },
        telemetryPayload
      );
      recordMetric(telemetryRes, 'telemetry');
    }
  }
}

function getPercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
}

async function runLoadTest() {
  console.log('====================================================================');
  console.log('🚀 XLURN VIDEO STREAMING - 100 CONCURRENT USERS STRESS TEST');
  console.log('====================================================================');
  console.log(`🔧 Test Mode                : ${MODE}`);
  console.log(`👥 Concurrent Virtual Users : ${CONCURRENT_USERS}`);
  console.log(`🎬 Target Video Stream URL  : ${VIDEO_URL}`);
  console.log(`📡 Target Telemetry API URL : ${API_URL}`);
  console.log(`📦 Range Chunk Size         : ${(CHUNK_SIZE_BYTES / 1024).toFixed(0)} KB x ${CHUNKS_PER_USER} chunks/user`);
  console.log('--------------------------------------------------------------------');
  console.log(`⏳ Launching all ${CONCURRENT_USERS} virtual users simultaneously...\n`);

  const testStart = Date.now();

  const userPromises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    userPromises.push(simulateSingleUser(i));
  }

  await Promise.all(userPromises);

  const totalDurationSec = (Date.now() - testStart) / 1000;
  const sortedLatencies = [...metrics.latenciesMs].sort((a, b) => a - b);
  const sortedStream = [...metrics.streamLatenciesMs].sort((a, b) => a - b);
  const sortedTelemetry = [...metrics.telemetryLatenciesMs].sort((a, b) => a - b);

  const avgLatency = sortedLatencies.length
    ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
    : 0;

  const totalMB = metrics.totalBytesDownloaded / (1024 * 1024);
  const throughputMBps = totalDurationSec > 0 ? totalMB / totalDurationSec : 0;
  const rps = totalDurationSec > 0 ? metrics.totalRequests / totalDurationSec : 0;
  const successRateNum = metrics.totalRequests > 0
    ? (metrics.successfulRequests / metrics.totalRequests) * 100
    : 0;

  console.log('====================================================================');
  console.log('📊 LOAD / STRESS TEST RESULTS SUMMARY');
  console.log('====================================================================');
  console.log(`⏱️  Total Test Duration       : ${totalDurationSec.toFixed(2)} seconds`);
  console.log(`📨 Total Requests Executed   : ${metrics.totalRequests}`);
  console.log(`✅ Successful Requests       : ${metrics.successfulRequests} (${successRateNum.toFixed(2)}%)`);
  console.log(`❌ Failed Requests           : ${metrics.failedRequests}`);
  console.log(`⚡ Throughput (Requests/sec) : ${rps.toFixed(2)} req/sec`);
  console.log(`📥 Total Video Data Streamed : ${totalMB.toFixed(2)} MB (${throughputMBps.toFixed(2)} MB/s)`);
  console.log('--------------------------------------------------------------------');
  console.log('📈 LATENCY BREAKDOWN (Milliseconds):');
  console.log(`   • Min Latency             : ${(sortedLatencies[0] || 0).toFixed(2)} ms`);
  console.log(`   • Average Latency         : ${avgLatency.toFixed(2)} ms`);
  console.log(`   • Median (p50) Latency    : ${getPercentile(sortedLatencies, 50).toFixed(2)} ms`);
  console.log(`   • p90 Latency             : ${getPercentile(sortedLatencies, 90).toFixed(2)} ms`);
  console.log(`   • p95 Latency             : ${getPercentile(sortedLatencies, 95).toFixed(2)} ms`);
  console.log(`   • p99 Latency (Max Spike) : ${getPercentile(sortedLatencies, 99).toFixed(2)} ms`);
  if (sortedStream.length > 0) {
    console.log(`   • Video Stream p95        : ${getPercentile(sortedStream, 95).toFixed(2)} ms`);
  }
  if (sortedTelemetry.length > 0) {
    console.log(`   • Telemetry API p95       : ${getPercentile(sortedTelemetry, 95).toFixed(2)} ms`);
  }
  console.log('--------------------------------------------------------------------');
  console.log('🔢 HTTP STATUS CODES:', JSON.stringify(metrics.statusCodes));
  if (Object.keys(metrics.errors).length > 0) {
    console.log('⚠️  ERRORS DETECTED  :', JSON.stringify(metrics.errors, null, 2));
  }
  console.log('--------------------------------------------------------------------');
  if (successRateNum >= 99) {
    console.log('🟢 VERDICT: PASSED — Server handled 100 concurrent video viewers with >= 99% success.');
  } else if (successRateNum >= 95) {
    console.log('🟡 VERDICT: WARNING — Minor packet/request drops under 100-user load (< 5% failure).');
  } else {
    console.log('🔴 VERDICT: FAILED — High failure rate detected. Check server status or bandwidth limits.');
  }
  console.log('====================================================================');

  httpAgent.destroy();
  httpsAgent.destroy();
}

runLoadTest();
