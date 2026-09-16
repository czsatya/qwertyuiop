# 24/7 Cloud Live Streaming Server

This is a Node.js based server that uses FFmpeg to loop and stream videos continuously to platforms like YouTube, Facebook Live, or Twitch. 

## Prerequisites
- Node.js installed
- **FFmpeg installed and added to your system PATH** (Crucial for the stream to work)

## Setup & Run Locally
1. Open terminal in this folder.
2. Run `npm install` (If not already done).
3. Start the server: `node server.js`
4. Open your browser and go to: `http://localhost:3000`

## Deployment (Cloud / VPS)
To run this 24/7 without your computer, deploy this folder to a Virtual Private Server (VPS) like DigitalOcean, AWS EC2, or Hostinger.

### VPS Setup Example (Ubuntu)
```bash
# Update and install dependencies
sudo apt update
sudo apt install nodejs npm ffmpeg -y

# Clone or copy this project to the VPS, then inside the folder run:
npm install

# Run the server in the background using PM2
sudo npm install -g pm2
pm2 start server.js --name "live-streamer"
pm2 save
pm2 startup
```

**Note on Render:** While you *can* deploy this to Render as a Web Service, the free tier goes to sleep after 15 minutes of inactivity. For 24/7 streaming, you must use a paid tier or a traditional VPS.
