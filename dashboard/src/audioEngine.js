/**
 * Web Audio API Acoustic Engine & Dynamic Loudness Normalizer
 * Provides AGC (Automatic Gain Control), 3-band parametric EQ,
 * real-time FFT spectrum analysis for 3D visualizer, and stereo decibel metering.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.source = null;
    this.compressor = null;
    this.bassFilter = null;
    this.midsFilter = null;
    this.trebleFilter = null;
    this.gainNode = null;
    this.analyser = null;
    
    this.isInitialized = false;
    this.isAgcActive = true;
    this.currentPreset = 'Normalizer';
    
    // EQ Gains in dB
    this.eqValues = {
      bass: 0,
      mids: 0,
      treble: 0
    };

    // Frequency buffer
    this.freqData = null;
    this.timeData = null;
  }

  init(videoElement) {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // 1. Source node from video
      this.source = this.ctx.createMediaElementSource(videoElement);

      // 2. Dynamics Compressor Node (Loudness Normalization / AGC)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.applyCompressorSettings(true);

      // 3. 3-Band Parametric Equalizer
      // LowShelf Bass (120 Hz)
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 120;
      this.bassFilter.gain.value = 0;

      // Peaking Mids (1000 Hz)
      this.midsFilter = this.ctx.createBiquadFilter();
      this.midsFilter.type = 'peaking';
      this.midsFilter.frequency.value = 1000;
      this.midsFilter.Q.value = 1.0;
      this.midsFilter.gain.value = 0;

      // HighShelf Treble (6500 Hz)
      this.trebleFilter = this.ctx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 6500;
      this.trebleFilter.gain.value = 0;

      // 4. Master Gain Node
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.0;

      // 5. Analyser Node for 3D Visualizer & Metering
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      // Connect graph:
      // Source -> Compressor -> Bass -> Mids -> Treble -> Gain -> Analyser -> Destination
      this.source.connect(this.compressor);
      this.compressor.connect(this.bassFilter);
      this.bassFilter.connect(this.midsFilter);
      this.midsFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (err) {
      console.warn('[AudioEngine] Web Audio API init deferred until user gesture:', err.message);
    }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        return true;
      } catch (err) {
        console.warn('[AudioEngine] Resume failed:', err);
      }
    }
    return false;
  }

  applyCompressorSettings(enable) {
    if (!this.compressor) return;
    this.isAgcActive = enable;

    if (enable) {
      // Dynamic Loudness Normalization Settings:
      // Smooths out difference between whisper quiet and ear-blasting loud streams
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
    } else {
      // Bypass compression
      this.compressor.threshold.setValueAtTime(0, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(1, this.ctx.currentTime);
    }
  }

  setAgc(active) {
    this.applyCompressorSettings(active);
  }

  setPreset(presetName) {
    this.currentPreset = presetName;
    if (!this.bassFilter || !this.midsFilter || !this.trebleFilter) return;

    switch (presetName) {
      case 'Voice Clarity':
        this.setEq('bass', -2.5);
        this.setEq('mids', 4.5);
        this.setEq('treble', 1.5);
        this.setAgc(true);
        break;
      case 'Cinema Surround':
        this.setEq('bass', 3.5);
        this.setEq('mids', -1.0);
        this.setEq('treble', 3.0);
        this.setAgc(true);
        break;
      case 'Bass Boost':
        this.setEq('bass', 6.0);
        this.setEq('mids', -0.5);
        this.setEq('treble', 1.0);
        break;
      case 'Night Mode':
        this.setEq('bass', -4.0);
        this.setEq('mids', 2.0);
        this.setEq('treble', -2.0);
        if (this.compressor) {
          this.compressor.threshold.setValueAtTime(-32, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        }
        break;
      case 'Studio Flat':
      default:
        this.setEq('bass', 0);
        this.setEq('mids', 0);
        this.setEq('treble', 0);
        this.setAgc(false);
        break;
    }
  }

  setEq(band, dbValue) {
    const val = parseFloat(dbValue);
    this.eqValues[band] = val;
    if (!this.ctx) return;

    if (band === 'bass' && this.bassFilter) {
      this.bassFilter.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    } else if (band === 'mids' && this.midsFilter) {
      this.midsFilter.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    } else if (band === 'treble' && this.trebleFilter) {
      this.trebleFilter.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }

  setVolume(volume) {
    if (this.gainNode && this.ctx) {
      const vol = Math.max(0, Math.min(1, parseFloat(volume)));
      this.gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Returns frequency data array for 3D Visualizer
   */
  getFrequencyData() {
    if (this.analyser && this.freqData) {
      this.analyser.getByteFrequencyData(this.freqData);
      return this.freqData;
    }
    return null;
  }

  /**
   * Returns audio decibel telemetry (RMS dB and peak dB)
   */
  getDecibelLevel() {
    if (!this.analyser || !this.timeData) {
      return { rmsDb: -60, peakDb: -60, percentage: 0 };
    }

    this.analyser.getByteTimeDomainData(this.timeData);
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      const abs = Math.abs(normalized);
      if (abs > peak) peak = abs;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / this.timeData.length);
    const rmsDb = rms > 0.0001 ? 20 * Math.log10(rms) : -60;
    const peakDb = peak > 0.0001 ? 20 * Math.log10(peak) : -60;
    
    // Normalized 0-100% for GUI meter
    const percentage = Math.max(0, Math.min(100, ((rmsDb + 60) / 60) * 100));

    return {
      rmsDb: Math.round(rmsDb * 10) / 10,
      peakDb: Math.round(peakDb * 10) / 10,
      percentage
    };
  }
}
