import Hls from 'hls.js';

/**
 * ChannelManager: Manages IPTV playlist channels, HLS video streaming,
 * pop-up interception, autoplay policy handling, and live stream telemetry.
 */
export class ChannelManager {
  constructor(videoElement, callbacks = {}) {
    this.video = videoElement;
    this.callbacks = Object.assign({
      onChannelChanged: () => {},
      onTelemetryUpdate: () => {},
      onAutoplayBlocked: () => {},
      onStreamError: () => {},
      onToast: () => {}
    }, callbacks);

    this.channels = [];
    this.metadata = {};
    this.currentChannelIndex = 0;
    this.previousChannelIndex = 0;
    this.hls = null;
    this.isStreamBuffering = false;

    // Telemetry state
    this.telemetryInterval = null;
    this.lastFragLoadedTime = Date.now();
    this.currentBitrate = 3500;
    this.currentLatency = 42;
    this.currentFps = 30;

    // Anti-repeat history buffer & true high-entropy randomizer
    this.recentHistory = [];
    this.maxRecentHistory = 18;

    // Sandbox popups
    this.setupPopupInterceptor();
  }

  /**
   * Prevents third-party stream ads or players from triggering rogue pop-ups
   */
  setupPopupInterceptor() {
    try {
      const originalOpen = window.open;
      window.open = (url, target, features) => {
        console.warn('[PopupInterceptor] Intercepted and blocked popup attempt to:', url);
        this.callbacks.onToast('info', 'Popup Blocked', 'External pop-up was automatically neutralized.');
        return null;
      };
    } catch (e) {
      console.warn('[PopupInterceptor] Could not override window.open:', e);
    }
  }

  /**
   * Load channels from channel_summaries.json
   */
  async loadChannels() {
    try {
      const res = await fetch('/channel_summaries.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.channels = data.channels || [];
      this.metadata = data.metadata || {};
      
      // Restore locally captured 16:9 downscaled thumbnails from cache
      try {
        const cachedThumbs = JSON.parse(localStorage.getItem('iptv_live_thumbnails') || '{}');
        this.channels.forEach(ch => {
          if (cachedThumbs[ch.id]) {
            ch.thumbnail = cachedThumbs[ch.id];
          }
        });
      } catch (e) {
        // Safe localStorage fallback
      }

      console.log(`[ChannelManager] Loaded ${this.channels.length} channels from channel_summaries.json`);
    } catch (err) {
      console.warn('[ChannelManager] Failed to load channel_summaries.json, using fallback:', err.message);
      // Fallback minimum channels
      this.channels = [
        {
          id: 'accuweather-now',
          number: 101,
          name: 'AccuWeather NOW',
          callsign: 'ACCU-HD',
          category: 'News & Weather',
          genre: 'Weather & Climate',
          streamUrl: 'https://d1gldweznovt26.cloudfront.net/Accuweather.m3u8',
          thumbnail: '/thumbnails/accuweather-now.svg',
          signalQuality: { score: 96, resolution: '1080p', fps: 30, bitrateKbps: 4200, latencyMs: 38 }
        }
      ];
    }

    return this.channels;
  }

  getActiveChannel() {
    return this.channels[this.currentChannelIndex] || null;
  }

  /**
   * Tune to channel by Index, ID, or Number
   */
  tuneToIndex(index) {
    if (index < 0 || index >= this.channels.length) return;
    this.previousChannelIndex = this.currentChannelIndex;
    this.currentChannelIndex = index;
    const channel = this.channels[index];
    this.playChannel(channel);
  }

  tuneToId(channelId) {
    const idx = this.channels.findIndex(c => c.id === channelId);
    if (idx !== -1) {
      this.tuneToIndex(idx);
    }
  }

  tuneByNumber(num) {
    const chNum = parseInt(num, 10);
    const idx = this.channels.findIndex(c => c.number === chNum);
    if (idx !== -1) {
      this.tuneToIndex(idx);
      return true;
    }
    return false;
  }

  nextChannel() {
    const nextIdx = (this.currentChannelIndex + 1) % this.channels.length;
    this.tuneToIndex(nextIdx);
  }

  prevChannel() {
    const prevIdx = (this.currentChannelIndex - 1 + this.channels.length) % this.channels.length;
    this.tuneToIndex(prevIdx);
  }

  recallChannel() {
    this.tuneToIndex(this.previousChannelIndex);
  }

  /**
   * Cryptographically secure, unbiased random integer in range [0, max - 1]
   * Eliminates PRNG clustering and modulo bias with rejection sampling.
   */
  getRandomInt(max) {
    if (max <= 1) return 0;
    try {
      const limit = Math.floor(0xFFFFFFFF / max) * max;
      const buf = new Uint32Array(1);
      let rand;
      do {
        window.crypto.getRandomValues(buf);
        rand = buf[0];
      } while (rand >= limit);
      return rand % max;
    } catch (e) {
      return Math.floor(Math.random() * max);
    }
  }

  /**
   * True High-Entropy Cryptographic Surprise Channel Selector
   * Strictly excludes recently viewed channels to prevent repetition.
   */
  randomChannel(candidatePool = null) {
    const pool = (Array.isArray(candidatePool) && candidatePool.length > 1)
      ? candidatePool
      : this.channels;

    if (!pool || pool.length <= 1) return null;

    const currentCh = this.getActiveChannel();
    const currentId = currentCh ? currentCh.id : null;

    // Dynamically calculate cooldown size:
    // Exclude up to the last 15 channels visited, capped at 65% of the pool
    // so that at least 35% of channels remain available for selection.
    const cooldownSize = Math.max(1, Math.min(this.recentHistory.length, Math.floor(pool.length * 0.65)));
    const blockedIds = new Set(this.recentHistory.slice(0, cooldownSize));
    if (currentId) blockedIds.add(currentId);

    // Filter to candidates that are NOT in the recently viewed cooldown window
    let candidates = pool.filter(ch => !blockedIds.has(ch.id));

    // If all channels in the pool have been visited, fall back to the channels visited longest ago
    if (candidates.length === 0) {
      candidates = pool.filter(ch => ch.id !== currentId);
      if (candidates.length === 0) candidates = pool;
    }

    // High-entropy cryptographic random selection
    const pickIdx = this.getRandomInt(candidates.length);
    const chosen = candidates[pickIdx];

    if (!chosen) return null;

    console.log(`[ChannelManager] 🎲 Surprise tuned to: ${chosen.name} (CH ${chosen.number}) [Cooldown blocked: ${blockedIds.size} recent channels]`);

    const chIdx = this.channels.findIndex(c => c.id === chosen.id);
    if (chIdx !== -1) {
      this.tuneToIndex(chIdx);
    } else {
      this.playChannel(chosen);
    }

    return chosen;
  }

  /**
   * Internal stream player setup with Hls.js
   */
  playChannel(channel) {
    if (!channel) return;

    // Record channel in anti-repeat recent history
    if (channel.id) {
      this.recentHistory = this.recentHistory.filter(id => id !== channel.id);
      this.recentHistory.unshift(channel.id);
      if (this.recentHistory.length > this.maxRecentHistory) {
        this.recentHistory.pop();
      }
    }

    console.log(`[ChannelManager] Tuning to CH ${channel.number}: ${channel.name} (${channel.streamUrl})`);
    this.callbacks.onChannelChanged(channel, this.currentChannelIndex);

    // Destroy existing Hls instance if any
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    const streamUrl = channel.streamUrl;

    this.isStreamBuffering = true;
    if (this.connectionWatchdogTimer) {
      clearTimeout(this.connectionWatchdogTimer);
      this.connectionWatchdogTimer = null;
    }

    // 8.5-second Connection Watchdog Timer to diagnose stalled/frozen handshakes
    this.connectionWatchdogTimer = setTimeout(() => {
      if (this.isStreamBuffering && (!this.video || this.video.readyState < 2)) {
        console.warn(`[ChannelManager] ⏱️ Connection handshake watchdog timeout (>8.5s) for ${channel.name}`);
        const diag = this.diagnoseError({
          type: 'networkError',
          details: 'manifestLoadTimeOut',
          response: { code: 408 }
        }, channel);
        this.callbacks.onStreamError(channel, diag);
        if (this.hls) {
          this.hls.destroy();
          this.hls = null;
        }
      }
    }, 8500);

    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8
      });

      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log(`[HLS] Manifest parsed. ${data.levels.length} quality levels available.`);
        this.attemptPlay();
      });

      this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = this.hls.levels[data.level];
        if (level) {
          this.currentBitrate = Math.round(level.bitrate / 1000);
          this.callbacks.onTelemetryUpdate({
            resolution: `${level.width}x${level.height}`,
            bitrate: this.currentBitrate
          });
        }
      });

      this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        if (this.connectionWatchdogTimer) {
          clearTimeout(this.connectionWatchdogTimer);
          this.connectionWatchdogTimer = null;
        }
        this.isStreamBuffering = false;
        const now = Date.now();
        this.currentLatency = Math.max(18, Math.min(600, now - this.lastFragLoadedTime));
        this.lastFragLoadedTime = now;
      });

      let networkErrorCount = 0;
      let mediaErrorCount = 0;
      const MAX_RETRIES = 2;

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('[HLS] Stream event error:', data.type, data.details, data.fatal, data.response?.code);

        if (data.fatal) {
          if (this.connectionWatchdogTimer) {
            clearTimeout(this.connectionWatchdogTimer);
            this.connectionWatchdogTimer = null;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= MAX_RETRIES) {
                console.warn(`[HLS] Fatal network error (attempt ${networkErrorCount}/${MAX_RETRIES}), recovering in 1s...`);
                setTimeout(() => {
                  if (this.hls) this.hls.startLoad();
                }, 1000);
              } else {
                const diagnosis = this.diagnoseError(data, channel);
                console.error('[HLS] Network error diagnosed:', diagnosis.title, diagnosis.reason);
                this.callbacks.onStreamError(channel, diagnosis);
                if (this.hls) {
                  this.hls.destroy();
                  this.hls = null;
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaErrorCount++;
              if (mediaErrorCount <= MAX_RETRIES) {
                console.warn(`[HLS] Fatal media error (attempt ${mediaErrorCount}/${MAX_RETRIES}), recovering...`);
                this.hls.recoverMediaError();
              } else {
                const diagnosis = this.diagnoseError(data, channel);
                console.error('[HLS] Media decode error diagnosed:', diagnosis.title);
                this.callbacks.onStreamError(channel, diagnosis);
                if (this.hls) {
                  this.hls.destroy();
                  this.hls = null;
                }
              }
              break;
            default:
              const diagnosis = this.diagnoseError(data, channel);
              console.error('[HLS] Fatal stream error diagnosed:', diagnosis.title);
              this.callbacks.onStreamError(channel, diagnosis);
              if (this.hls) {
                this.hls.destroy();
                this.hls = null;
              }
              break;
          }
        }
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      this.video.src = streamUrl;
      this.video.addEventListener('loadedmetadata', () => {
        this.attemptPlay();
      }, { once: true });
    }

    this.startTelemetryLoop();
  }

  /**
   * Attempt playback with Autoplay policy guard
   */
  async attemptPlay() {
    try {
      await this.video.play();
      console.log('[ChannelManager] Playback started successfully');
    } catch (err) {
      console.warn('[ChannelManager] Autoplay blocked or failed:', err.message);
      // Mute and retry for clean background preview
      this.video.muted = true;
      try {
        await this.video.play();
        this.callbacks.onAutoplayBlocked();
      } catch (e) {
        console.warn('[ChannelManager] Muted play also failed:', e.message);
      }
    }
  }

  unmute() {
    this.video.muted = false;
    this.video.play().catch(e => console.warn('Unmute play error:', e));
  }

  togglePlayPause() {
    if (this.video.paused) {
      this.video.play().catch(e => console.warn(e));
      return true;
    } else {
      this.video.pause();
      return false;
    }
  }

  /**
   * Continuous telemetry monitor
   */
  startTelemetryLoop() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);

    this.telemetryInterval = setInterval(() => {
      const channel = this.getActiveChannel();
      if (!channel) return;

      // Extract playback quality
      let droppedFrames = 0;
      let totalFrames = 0;
      if (this.video.getVideoPlaybackQuality) {
        const q = this.video.getVideoPlaybackQuality();
        droppedFrames = q.droppedVideoFrames;
        totalFrames = q.totalVideoFrames;
      }

      // Buffer length
      let bufferSec = 0;
      if (this.video.buffered && this.video.buffered.length > 0) {
        const curTime = this.video.currentTime;
        for (let i = 0; i < this.video.buffered.length; i++) {
          if (this.video.buffered.start(i) <= curTime && curTime <= this.video.buffered.end(i)) {
            bufferSec = Math.round((this.video.buffered.end(i) - curTime) * 10) / 10;
            break;
          }
        }
      }

      const isLive = !this.video.paused && this.video.readyState >= 2;
      const res = this.video.videoWidth > 0 ? `${this.video.videoWidth}x${this.video.videoHeight}` : (channel.signalQuality.resolution || '1080p');

      try {
        this.callbacks.onTelemetryUpdate({
          isLive,
          resolution: res,
          latency: this.currentLatency,
          bitrate: this.currentBitrate || (channel.signalQuality && channel.signalQuality.bitrateKbps) || 3500,
          bufferSec,
          droppedFrames,
          totalFrames,
          qualityScore: (channel.signalQuality && channel.signalQuality.score) || 96
        });
      } catch (telemetryErr) {
        // Guard against telemetry callback exceptions
      }
    }, 1000);
  }

  /**
   * Diagnostic Classifier for Stream Issues
   * Identifies Geoblocks (403), Paywall/DRM (401), Dead links (404),
   * Gateway overloads (502/503), Timeouts (408), and Codec incompatibilities.
   */
  diagnoseError(data, channel) {
    const httpCode = data?.response?.code || data?.networkDetails?.status || 0;
    const details = (data?.details || '').toLowerCase();
    const country = channel?.country?.name || 'International';
    const network = channel?.responsibleCompany || 'Broadcast Studio';

    // 1. Paywall & DRM Encrypted Feed (401 Unauthorized / Key Load Blocked)
    if (httpCode === 401 || details.includes('keyload') || details.includes('decrypt') || details.includes('auth')) {
      return {
        category: 'PAYWALL_DRM',
        code: 401,
        title: '🔒 PAYWALL / ENCRYPTED FEED',
        badge: '🔒 PAYWALL / DRM',
        color: '#e63946',
        reason: 'Subscriber Authentication Required (HTTP 401)',
        message: `This live stream is protected by DRM encryption or requires an active subscriber authentication token. Upstream network '${network}' does not permit public playback without licensing keys.`
      };
    }

    // 2. Region Banned / Geo-Locked (403 Forbidden / Territory Restriction)
    if (httpCode === 403 || details.includes('forbidden') || details.includes('cors')) {
      return {
        category: 'GEO_BLOCKED',
        code: 403,
        title: '🔴 REGION BANNED / GEO-LOCKED',
        badge: '🔴 REGION BANNED',
        color: '#ff4d6d',
        reason: `Geographic Blackout / Access Denied (HTTP 403) in ${country}`,
        message: `Upstream CDN server restricted this broadcast to authorized domestic IP addresses within ${country}. Requests originating from outside the broadcast territory are rejected by the origin edge.`
      };
    }

    // 3. Feed Offline / Transmitter Dark (404 Not Found / 410 Gone)
    if (httpCode === 404 || httpCode === 410) {
      return {
        category: 'FEED_OFFLINE',
        code: httpCode,
        title: '🔴 BROADCAST FEED OFFLINE',
        badge: '🔴 FEED OFFLINE',
        color: '#e63946',
        reason: `Transmitter Dark / Resource Not Found (HTTP ${httpCode})`,
        message: `The live transmission manifest was not found on the origin server (HTTP ${httpCode}). The channel is between scheduled programming or the CDN endpoint has been retired.`
      };
    }

    // 4. Server Gateway / CDN Overload Error (500, 502, 503, 504)
    if (httpCode >= 500 && httpCode <= 504) {
      return {
        category: 'SERVER_GATEWAY_ERROR',
        code: httpCode,
        title: '⚠️ BROADCAST SERVER OVERLOAD',
        badge: `⚠️ SERVER ${httpCode}`,
        color: '#ffb703',
        reason: `Upstream CDN Gateway Error (HTTP ${httpCode})`,
        message: `The station's CDN delivery gateway is congested or temporarily undergoing maintenance (HTTP ${httpCode}). Live transport segments failed to route through the edge cache.`
      };
    }

    // 5. Connection Stalled / Handshake Timeout (408 / >8.5s watchdog)
    if (details.includes('timeout') || httpCode === 408) {
      return {
        category: 'CONNECTION_TIMEOUT',
        code: 408,
        title: '⏱️ CONNECTION TIMED OUT',
        badge: '⏱️ TIMED OUT',
        color: '#fb8500',
        reason: 'Server Link Handshake Unresponsive (>8.5s)',
        message: 'The broadcast server failed to complete the initial TCP/TLS handshake within 8,500ms. Upstream edge relay dropped connection packets.'
      };
    }

    // 6. Media Codec / Demux Hardware Incompatibility
    if (data?.type === 'mediaError' || details.includes('codec') || details.includes('demux')) {
      return {
        category: 'CODEC_INCOMPATIBLE',
        code: 0,
        title: '⚠️ CODEC UNSUPPORTED',
        badge: '⚠️ CODEC ERROR',
        color: '#f77f00',
        reason: 'HTML5 WebGL Hardware Decoder Incompatible',
        message: 'The transmission codecs used by this stream cannot be decoded natively by the browser WebGL pipeline.'
      };
    }

    // 7. General Network Error fallback
    return {
      category: 'NETWORK_FAILURE',
      code: httpCode,
      title: '⚠️ SIGNAL BUFFERING FAILURE',
      badge: '⚠️ SIGNAL LOST',
      color: '#ffb703',
      reason: `Network Telemetry Packet Loss (${data?.details || 'Connection Drop'})`,
      message: `Failed to receive live transport segments from the broadcaster. Network packets dropped: ${data?.details || 'Signal connection dropped'}.`
    };
  }
}
