import { AudioEngine } from './audioEngine.js';
import { ChannelManager } from './channelManager.js';
import { Scene3D } from './scene3D.js';
import { JsonInspector } from './jsonInspector.js';
import { UIController } from './uiController.js';
import { DVRManager } from './dvrManager.js';

/**
 * Main Application Orchestrator for Cyber-IPTV 3D Broadcast Control Center
 */
async function bootstrap() {
  console.log('[App] Bootstrapping Cyber-IPTV 3D Broadcast Control Center with DVR & International Directory...');

  const masterVideo = document.getElementById('masterVideo');
  const threeCanvas = document.getElementById('threeCanvas');
  const jsonTreeContainer = document.getElementById('jsonTreeContainer');

  const activeSummaryEls = {
    channelName: document.getElementById('sumChannelName'),
    overview: document.getElementById('sumOverview'),
    corporate: document.getElementById('sumCorporate'),
    signalVerdict: document.getElementById('sumSignalVerdict')
  };

  // 1. Audio Engine (Web Audio API Dynamics Compressor + 3-Band Parametric EQ + Analyser)
  const audioEngine = new AudioEngine();

  // 2. Expandable JSON Inspector
  let uiController = null;
  const jsonInspector = new JsonInspector(
    jsonTreeContainer,
    activeSummaryEls,
    (type, title, msg) => uiController && uiController.showToast(type, title, msg)
  );

  // 3. Three.js 3D Master Scene with Flat 16:9 Screen (High-Resolution Safe)
  const scene3D = new Scene3D(
    threeCanvas,
    masterVideo,
    (channel, index) => {
      // 3D Card Clicked -> tune directly
      channelManager.tuneToIndex(index);
    },
    (channel, screenX, screenY) => {
      // 3D Card Hovered -> show HUD tooltip
      if (uiController) {
        uiController.showCardTooltip(channel, screenX, screenY);
      }
    }
  );
  scene3D.setAudioEngine(audioEngine);

  // 4. Channel Manager (HLS, popup interception, telemetry)
  const channelManager = new ChannelManager(masterVideo, {
    onChannelChanged: (channel, index) => {
      scene3D.setActiveChannelVisual(index, channel);
      if (uiController) {
        uiController.updateActiveChannelDisplay(channel, index);
      }
    },
    onTelemetryUpdate: (data) => {
      if (uiController) {
        uiController.updateTelemetry(data);
      }
    },
    onAutoplayBlocked: () => {
      if (uiController) {
        uiController.showAutoplayUnlock();
      }
    },
    onStreamError: (channel, details) => {
      if (uiController) {
        uiController.showStreamError(channel, details);
      }
    },
    onToast: (type, title, msg) => {
      if (uiController) {
        uiController.showToast(type, title, msg);
      }
    }
  });

  // 5. DVR Manager (Streams capture & standardized export: DVR_{timestamp}_CH{num}_{brand})
  const dvrManager = new DVRManager(
    masterVideo,
    (state) => uiController && uiController.updateDvrState(state),
    (type, title, msg) => uiController && uiController.showToast(type, title, msg)
  );

  // 6. UI Controller
  uiController = new UIController(channelManager, audioEngine, scene3D, jsonInspector, dvrManager);

  // User gesture listener for Web Audio API activation
  const activateAudioOnGesture = () => {
    audioEngine.init(masterVideo);
    audioEngine.resume();
    window.removeEventListener('click', activateAudioOnGesture);
    window.removeEventListener('keydown', activateAudioOnGesture);
  };
  window.addEventListener('click', activateAudioOnGesture, { once: true });
  window.addEventListener('keydown', activateAudioOnGesture, { once: true });

  // 7. Load Channel Listings & Smoke Test Summaries
  try {
    const channels = await channelManager.loadChannels();
    
    // Fetch raw JSON reports
    const res = await fetch('/channel_summaries.json');
    if (res.ok) {
      const report = await res.json();
      jsonInspector.loadData(report);
    }

    // Build 3D Hologram Carousel
    scene3D.buildChannelCarousel(channels, 0);

    // Render Bottom Channel Dock with Country Filters
    uiController.renderChannelCardsRail();

    // Start playback on first channel
    if (channels.length > 0) {
      channelManager.tuneToIndex(0);
    }

    uiController.showToast('success', 'Control Deck Ready', `Connected to international broadcast network. 15,775 channels cataloged.`);
  } catch (err) {
    console.error('[App] Initialization error:', err);
    if (uiController) uiController.showToast('error', 'Initialization Error', err.message);
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
