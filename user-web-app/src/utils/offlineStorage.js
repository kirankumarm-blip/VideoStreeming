// IndexedDB Offline Video Storage (JioCinema / Netflix style in-app offline playback)
const DB_NAME = 'StreamHubOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_videos';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });
}

export const offlineStorage = {
  // Download video with progress and save directly into IndexedDB
  async saveVideo(videoInfo, onProgress) {
    const videoUrl = videoInfo.videoUrl || videoInfo.video_url;
    if (!videoUrl) throw new Error('No valid video URL to download');

    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    let receivedBytes = 0;
    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;
      if (onProgress && totalBytes > 0) {
        const percent = Math.round((receivedBytes / totalBytes) * 100);
        onProgress(percent, receivedBytes, totalBytes);
      }
    }

    const videoBlob = new Blob(chunks, { type: 'video/mp4' });

    // Store in IndexedDB
    const db = await openDB();
    const record = {
      id: String(videoInfo.id),
      videoId: String(videoInfo.id),
      title: videoInfo.title || 'Untitled Video',
      description: videoInfo.description || '',
      instructor: videoInfo.instructor || 'Instructor',
      duration: videoInfo.duration || '',
      thumbnail: videoInfo.thumbnail || videoInfo.thumbnailUrl || videoInfo.thumbnail_url || '',
      videoBlob: videoBlob,
      size: videoBlob.size,
      subtitles: videoInfo.subtitles || {},
      subtitleTracks: videoInfo.subtitleTracks || videoInfo.subtitle_tracks || [],
      savedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    });
  },

  // Get all offline videos metadata
  async getAllVideos() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          const list = (request.result || []).map(item => ({
            id: item.id,
            videoId: item.id,
            title: item.title,
            description: item.description,
            instructor: item.instructor,
            duration: item.duration,
            thumbnail: item.thumbnail,
            size: item.size,
            formattedSize: (item.size / (1024 * 1024)).toFixed(1) + ' MB',
            savedAt: item.savedAt,
            isOfflineStored: true,
            hasBlob: Boolean(item.videoBlob)
          }));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('offlineStorage.getAllVideos error:', e);
      return [];
    }
  },

  // Get single offline video with blob
  async getVideo(id) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(String(id));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('offlineStorage.getVideo error:', e);
      return null;
    }
  },

  // Check if video is already downloaded
  async isVideoDownloaded(id) {
    if (!id) return false;
    try {
      const video = await this.getVideo(id);
      return Boolean(video && video.videoBlob);
    } catch (e) {
      return false;
    }
  },

  // Delete offline video
  async deleteVideo(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(String(id));
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
};
