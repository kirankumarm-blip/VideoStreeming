"""
XLURN Video Streaming & Playback Telemetry Load Test Script (Locust)
=====================================================================
Target: 100 Concurrent Learners streaming HTTP Byte-Range Video Chunks
        and sending Playback Telemetry Heartbeats.
"""

import time
import random
from locust import HttpUser, task, between, events

# Configuration Constants
VIDEO_PATH = "/uploads/video-1783335988093-238108433.mp4"
TOTAL_VIDEO_SIZE = 24470611  # ~24.47 MB
CHUNK_SIZE = 1048576          # 1 MB chunk (1,048,576 bytes)
TOTAL_CHUNKS = (TOTAL_VIDEO_SIZE + CHUNK_SIZE - 1) // CHUNK_SIZE # 24 chunks

class VideoStreamLearner(HttpUser):
    # Simulate realistic delay between chunk buffer updates (0.2s - 0.8s)
    wait_time = between(0.2, 0.8)

    def on_start(self):
        self.user_id = f"User_{random.randint(1000, 9999)}"
        self.current_chunk = 0
        self.total_bytes = 0
        self.buffer_seconds = 0.0

    @task(5)
    def fetch_video_chunk(self):
        """Fetch sequential 1MB Byte-Range chunk (HTTP 206 Partial Content)"""
        if self.current_chunk >= TOTAL_CHUNKS:
            # Loop playback or restart stream
            self.current_chunk = 0

        start_byte = self.current_chunk * CHUNK_SIZE
        end_byte = min(start_byte + CHUNK_SIZE - 1, TOTAL_VIDEO_SIZE - 1)
        headers = {
            "Range": f"bytes={start_byte}-{end_byte}",
            "User-Agent": f"XLURN-Learner-Client/2.0 ({self.user_id})",
            "Accept": "*/*"
        }

        start_time = time.perf_counter()
        with self.client.get(
            VIDEO_PATH,
            headers=headers,
            name=f"Video Chunk [{self.current_chunk:02d}/{TOTAL_CHUNKS}]",
            catch_response=True,
            stream=True
        ) as response:
            latency_ms = (time.perf_counter() - start_time) * 1000
            
            if response.status_code == 206:
                content_len = len(response.content)
                self.total_bytes += content_len
                self.current_chunk += 1
                
                # Verify chunk duration against download latency
                # 1 MB video at ~1.5 Mbps represents ~5.5 seconds of media
                chunk_media_duration = 5.5
                download_seconds = latency_ms / 1000.0
                
                if download_seconds > chunk_media_duration:
                    response.failure(f"Buffer Underflow Risk: chunk took {download_seconds:.2f}s > {chunk_media_duration}s")
                else:
                    response.success()
            else:
                response.failure(f"Unexpected HTTP {response.status_code}")

    @task(1)
    def send_playback_telemetry(self):
        """Simulate periodic playback heartbeat tracking"""
        payload = {
            "userId": self.user_id,
            "videoId": "video-1783335988093-238108433",
            "formStep": "watchsession",
            "currentTime": self.current_chunk * 5.5,
            "duration": 132.0,
            "status": "playing",
            "bufferLength": 15.0,
            "timestamp": int(time.time() * 1000)
        }
        headers = {"Content-Type": "application/json"}
        with self.client.post("/vdUser", json=payload, name="Telemetry Heartbeat (/vdUser)", catch_response=True) as response:
            if response.status_code in [200, 201, 204]:
                response.success()
            else:
                response.failure(f"Telemetry failed: {response.status_code}")
