const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static('public'));
app.use(express.json());

// Setup Multer for video uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create safe filename
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, safeName);
    }
});
const upload = multer({ storage: storage });

// State to keep track of the current streaming process
let currentStreamProcess = null;
let currentStreamState = {
    isActive: false,
    video: null,
    rtmpUrl: null,
    startTime: null
};

// API: Upload video
app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// API: List available videos
app.get('/api/videos', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read uploads directory' });
        }
        const videos = files.filter(f => f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.avi'));
        res.json({ videos });
    });
});

// API: Get stream status
app.get('/api/stream/status', (req, res) => {
    res.json(currentStreamState);
});

// API: Start stream
app.post('/api/stream/start', (req, res) => {
    const { video, rtmpUrl } = req.body;

    if (!video || !rtmpUrl) {
        return res.status(400).json({ error: 'Video and RTMP URL are required' });
    }

    if (currentStreamState.isActive) {
        return res.status(400).json({ error: 'A stream is already running. Please stop it first.' });
    }

    const videoPath = path.join(uploadDir, video);
    if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'Video file not found' });
    }

    console.log(`Starting stream for video: ${video}`);
    
    // FFmpeg command to loop the video and stream via RTMP
    const ffmpegArgs = [
        '-re',                  // Read input at native frame rate
        '-stream_loop', '-1',   // Infinite loop
        '-i', videoPath,        // Input file
        '-c:v', 'copy',         // Stream copy video (No CPU usage)
        '-c:a', 'copy',         // Stream copy audio (No CPU usage)
        '-f', 'flv',            // Output format for RTMP
        rtmpUrl
    ];

    currentStreamProcess = spawn(ffmpegPath, ffmpegArgs);

    currentStreamState = {
        isActive: true,
        video: video,
        rtmpUrl: rtmpUrl,
        startTime: new Date().toISOString()
    };

    currentStreamProcess.stdout.on('data', (data) => {
        // Output from ffmpeg stdout (if any)
    });

    currentStreamProcess.stderr.on('data', (data) => {
        // FFmpeg writes its progress to stderr
        console.log(`FFmpeg: ${data}`);
    });

    currentStreamProcess.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        currentStreamState.isActive = false;
        currentStreamProcess = null;
    });

    res.json({ message: 'Stream started successfully', state: currentStreamState });
});

// API: Stop stream
app.post('/api/stream/stop', (req, res) => {
    if (!currentStreamState.isActive || !currentStreamProcess) {
        return res.status(400).json({ error: 'No active stream to stop' });
    }

    console.log('Stopping stream...');
    currentStreamProcess.kill('SIGKILL'); // Force kill ffmpeg
    
    currentStreamState.isActive = false;
    currentStreamProcess = null;

    res.json({ message: 'Stream stopped successfully' });
});

// Create public dir if missing
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

app.listen(PORT, () => {
    console.log(`Live streaming control server running on http://localhost:${PORT}`);
});
