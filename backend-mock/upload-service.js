require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// MinIO Credentials configuration
const minioEndPoint = process.env.MINIO_ENDPOINT || 'localhost';
const minioPort = parseInt(process.env.MINIO_PORT) || 9000;
const minioUseSSL = process.env.MINIO_USE_SSL === 'true';
const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'admin';
const minioSecretKey = process.env.MINIO_SECRET_KEY || 'Admin@123';
const minioBucket = process.env.MINIO_BUCKET || 'vdvideos';

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: minioEndPoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey
});

// Ensure Bucket exists
(async () => {
  try {
    const exists = await minioClient.bucketExists(minioBucket);
    if (!exists) {
      await minioClient.makeBucket(minioBucket);
      console.log(`Created MinIO Bucket: ${minioBucket}`);
    } else {
      console.log(`MinIO Bucket "${minioBucket}" exists.`);
    }
  } catch (err) {
    console.error("Warning: Failed to verify/create MinIO bucket:", err.message);
  }
})();

// Create local temp directory for chunks
const tempDir = path.join(__dirname, 'temp_chunks');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer for temp chunk upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { uploadId } = req.body;
    const chunkPath = path.join(tempDir, uploadId || 'default');
    if (!fs.existsSync(chunkPath)) {
      fs.mkdirSync(chunkPath, { recursive: true });
    }
    cb(null, chunkPath);
  },
  filename: (req, file, cb) => {
    const { chunkIndex } = req.body;
    cb(null, `part-${chunkIndex || '0'}`);
  }
});
const upload = multer({ storage });

// 1. Initiate Upload
app.post('/api/upload/initiate', (req, res) => {
  const { fileName, fileType, fileSize } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required' });
  }
  const uploadId = crypto.randomBytes(16).toString('hex');
  
  // Create unique subfolder
  const chunkPath = path.join(tempDir, uploadId);
  if (!fs.existsSync(chunkPath)) {
    fs.mkdirSync(chunkPath, { recursive: true });
  }

  // Return uploadId and recommended chunk size (5MB)
  res.json({ uploadId, chunkSize: 5 * 1024 * 1024 });
});

// 2. Upload Chunk
app.post('/api/upload/chunk', upload.single('chunk'), (req, res) => {
  const { uploadId, chunkIndex } = req.body;
  if (!uploadId || chunkIndex === undefined) {
    return res.status(400).json({ error: 'uploadId and chunkIndex are required' });
  }
  res.json({ success: true, chunkIndex });
});

// 3. Complete Chunked Upload (Assembles & uploads to MinIO & generates presigned URL)
app.post('/api/upload/complete', async (req, res) => {
  const { uploadId, fileName, totalChunks } = req.body;
  if (!uploadId || !fileName || !totalChunks) {
    return res.status(400).json({ error: 'Missing required parameters: uploadId, fileName, totalChunks' });
  }

  const chunkPath = path.join(tempDir, uploadId);
  if (!fs.existsSync(chunkPath)) {
    return res.status(400).json({ error: 'Upload session not found or expired' });
  }

  // Check if all parts exist
  for (let i = 0; i < totalChunks; i++) {
    const partPath = path.join(chunkPath, `part-${i}`);
    if (!fs.existsSync(partPath)) {
      return res.status(400).json({ error: `Missing chunk part-${i}` });
    }
  }

  // Generate unique file ID and MinIO object key
  const fileId = crypto.randomUUID();
  const fileExtension = path.extname(fileName);
  const objectName = `uploads/${fileId}${fileExtension}`;
  const assembledFilePath = path.join(tempDir, `${fileId}${fileExtension}`);

  try {
    // Merge chunks
    const writeStream = fs.createWriteStream(assembledFilePath);
    for (let i = 0; i < totalChunks; i++) {
      const partPath = path.join(chunkPath, `part-${i}`);
      const partData = fs.readFileSync(partPath);
      writeStream.write(partData);
    }
    writeStream.end();

    // Wait for file write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Upload to MinIO
    await minioClient.fPutObject(minioBucket, objectName, assembledFilePath, {});
    console.log(`Successfully uploaded ${objectName} to MinIO bucket ${minioBucket}`);

    // Generate presigned GET URL (expires in 7 days - maximum allowed by S3-compatible providers)
    const expirySeconds = 7 * 24 * 60 * 60;
    const minioUrl = await minioClient.presignedGetObject(minioBucket, objectName, expirySeconds);
    console.log(`Generated presigned URL: ${minioUrl}`);

    // Clean up local temp files
    fs.unlinkSync(assembledFilePath);
    fs.readdirSync(chunkPath).forEach(file => {
      fs.unlinkSync(path.join(chunkPath, file));
    });
    fs.rmdirSync(chunkPath);

    res.json({ success: true, fileId, objectName, minioUrl });
  } catch (err) {
    console.error("Assembly or upload error:", err);
    // Cleanup if possible
    if (fs.existsSync(assembledFilePath)) {
      try { fs.unlinkSync(assembledFilePath); } catch (e) {}
    }
    res.status(500).json({ error: err.message || 'Assembly/Upload failed' });
  }
});

// 4. Register Video Metadata & notify n8n
app.post('/api/upload/register-video', async (req, res) => {
  const { title, description, category, tags, visibility, videoUrl, thumbnailUrl, fileId } = req.body;
  const authHeader = req.headers['authorization'];

  try {
    const payload = {
      formStep: 'uploadVideo',
      title,
      description,
      category,
      tags,
      visibility,
      videoUrl,
      thumbnailUrl,
      fileId: fileId || crypto.randomUUID()
    };

    console.log("Sending metadata registration to UAT n8n:", payload);
    const n8nResponse = await axios.post(
      'https://uat-02-api.darpanx.com/webhook/vdadminVideos',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || ''
        }
      }
    );

    res.json({
      success: true,
      n8nResponse: n8nResponse.data
    });
  } catch (err) {
    console.error("Failed to forward video metadata to UAT n8n webhook:", err.message);
    res.status(500).json({
      error: 'Failed to notify n8n webhook database registry',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Chunked upload service running on port ${PORT}`);
});
