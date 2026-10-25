/**
 * DVRManager: Digital Video Recorder engine for IPTV live streams.
 * Captures live stream audio & video tracks via MediaRecorder, monitors buffer size,
 * tracks recording duration, and exports files named by:
 * DVR_{timestamp}_CH{channelNumber}_{brandName}.webm (or .mp4)
 */

export class DVRManager {
  constructor(videoElement, onStateChange = () => {}, onToast = () => {}) {
    this.video = videoElement;
    this.onStateChange = onStateChange;
    this.onToast = onToast;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.elapsedSeconds = 0;
    this.currentChannel = null;
    this.totalBytesRecorded = 0;

    // Recording history
    this.recordingsHistory = [];
  }

  /**
   * Start recording the current live stream
   */
  startRecording(channel) {
    if (this.isRecording) {
      console.warn('[DVR] Recording already in progress.');
      return false;
    }

    if (!this.video || this.video.readyState < 2) {
      this.onToast('error', 'DVR Error', 'Stream is not ready for recording. Wait for signal lock.');
      return false;
    }

    this.currentChannel = channel;
    this.recordedChunks = [];
    this.totalBytesRecorded = 0;
    this.elapsedSeconds = 0;

    try {
      // Capture stream from HTML5 video element
      let stream = null;
      if (typeof this.video.captureStream === 'function') {
        stream = this.video.captureStream(30);
      } else if (typeof this.video.mozCaptureStream === 'function') {
        stream = this.video.mozCaptureStream(30);
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('Video captureStream not available on this stream.');
      }

      // Pick best supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/mp4',
        'video/webm'
      ];

      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 3500000 } : {};
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.totalBytesRecorded += event.data.size;
          this.notifyState();
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishAndExport();
      };

      // Request data every 1 second
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // Start elapsed timer
      this.recordingTimer = setInterval(() => {
        this.elapsedSeconds = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.notifyState();
      }, 1000);

      this.notifyState();
      this.onToast('success', 'DVR Recording Started', `Recording CH ${channel.number} (${channel.name})`);
      return true;
    } catch (err) {
      console.error('[DVR] Failed to start MediaRecorder:', err);
      this.onToast('error', 'DVR Capture Failed', err.message);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stop recording and trigger download
   */
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return null;

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    this.isRecording = false;
    this.mediaRecorder.stop();
    this.notifyState();
    return true;
  }

  /**
   * Compiles blob and downloads with exact filename convention
   * Name specification: DVR_{timestamp}_CH{channelNumber}_{brandName}.webm
   */
  finishAndExport() {
    if (this.recordedChunks.length === 0) {
      this.onToast('error', 'DVR Empty', 'No data recorded.');
      return;
    }

    const mime = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mime });
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';

    // Format Timestamp: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    // Format Channel Number
    const chNum = `CH${this.currentChannel?.number || this.currentChannel?.channelNumber || '000'}`;

    // Format Brand Name (sanitized)
    const rawBrand = this.currentChannel?.responsibleCompany || this.currentChannel?.name || 'IPTV';
    const brandName = rawBrand
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 32);

    // Exact filename requirement: DVR_{timestamp}_{channelNumber}_{brandName}.ext
    const filename = `DVR_${timestamp}_${chNum}_${brandName}.${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);

    const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    const durationStr = this.formatDuration(this.elapsedSeconds);

    // Store in history
    const recordItem = {
      filename,
      timestamp,
      channel: this.currentChannel,
      duration: durationStr,
      size: `${sizeMB} MB`,
      url
    };
    this.recordingsHistory.unshift(recordItem);

    this.onToast('success', 'DVR Export Complete', `Saved: ${filename} (${sizeMB} MB, ${durationStr})`);
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  notifyState() {
    const sizeMB = (this.totalBytesRecorded / (1024 * 1024)).toFixed(2);
    this.onStateChange({
      isRecording: this.isRecording,
      elapsedSeconds: this.elapsedSeconds,
      formattedDuration: this.formatDuration(this.elapsedSeconds),
      sizeMB: `${sizeMB} MB`,
      channel: this.currentChannel,
      recordingsHistory: this.recordingsHistory
    });
  }
}
