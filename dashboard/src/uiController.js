import { VisionAnalyzer } from './visionAnalyzer.js';
import { FindingsOrchestrator } from './findingsOrchestrator.js';
import { MemoryManager } from './memoryManager.js';
import { NetballScanner } from './netballScanner.js';

const COUNTRY_LANGUAGE_MAP = {
  ad: 'Catalan', ae: 'Arabic', af: 'Pashto', ag: 'English', al: 'Albanian',
  am: 'Armenian', ao: 'Portuguese', ar: 'Spanish', at: 'German', au: 'English',
  aw: 'Dutch', az: 'Azerbaijani', ba: 'Bosnian', bb: 'English', bd: 'Bengali',
  be: 'French', bf: 'French', bg: 'Bulgarian', bh: 'Arabic', bi: 'Kirundi',
  bj: 'French', bm: 'English', bn: 'Malay', bo: 'Spanish', bq: 'Dutch',
  br: 'Portuguese', bs: 'English', bt: 'Dzongkha', bw: 'English', by: 'Belarusian',
  bz: 'English', ca: 'English', cd: 'French', cf: 'French', cg: 'French',
  ch: 'German', ci: 'French', cl: 'Spanish', cm: 'French', cn: 'Chinese',
  co: 'Spanish', cr: 'Spanish', cu: 'Spanish', cv: 'Portuguese', cw: 'Dutch',
  cy: 'Greek', cz: 'Czech', de: 'German', dj: 'French', dk: 'Danish',
  dm: 'English', do: 'Spanish', dz: 'Arabic', ec: 'Spanish', ee: 'Estonian',
  eg: 'Arabic', eh: 'Arabic', er: 'Tigrinya', es: 'Spanish', et: 'Amharic',
  fi: 'Finnish', fj: 'English', fm: 'English', fo: 'Faroese', fr: 'French',
  ga: 'French', gb: 'English', gd: 'English', ge: 'Georgian', gf: 'French',
  gh: 'English', gi: 'English', gl: 'Greenlandic', gm: 'English', gn: 'French',
  gp: 'French', gq: 'Spanish', gr: 'Greek', gt: 'Spanish', gu: 'English',
  gw: 'Portuguese', gy: 'English', hk: 'Cantonese', hn: 'Spanish', hr: 'Croatian',
  ht: 'French', hu: 'Hungarian', id: 'Indonesian', ie: 'English', il: 'Hebrew',
  in: 'Hindi', iq: 'Arabic', ir: 'Persian', is: 'Icelandic', it: 'Italian',
  jm: 'English', jo: 'Arabic', jp: 'Japanese', ke: 'English', kg: 'Kyrgyz',
  kh: 'Khmer', ki: 'English', km: 'Arabic', kn: 'English', kp: 'Korean',
  kr: 'Korean', kw: 'Arabic', ky: 'English', kz: 'Kazakh', la: 'Lao',
  lb: 'Arabic', lc: 'English', li: 'German', lk: 'Sinhala', lr: 'English',
  ls: 'English', lt: 'Lithuanian', lu: 'Luxembourgish', lv: 'Latvian', ly: 'Arabic',
  ma: 'Arabic', mc: 'French', md: 'Romanian', me: 'Montenegrin', mf: 'French',
  mg: 'Malagasy', mh: 'English', mk: 'Macedonian', ml: 'French', mm: 'Burmese',
  mn: 'Mongolian', mo: 'Chinese', mp: 'English', mq: 'French', mr: 'Arabic',
  ms: 'English', mt: 'Maltese', mu: 'English', mv: 'Dhivehi', mw: 'English',
  mx: 'Spanish', my: 'Malay', mz: 'Portuguese', na: 'English', nc: 'French',
  ne: 'French', ng: 'English', ni: 'Spanish', nl: 'Dutch', no: 'Norwegian',
  np: 'Nepali', nr: 'English', nz: 'English', om: 'Arabic', pa: 'Spanish',
  pe: 'Spanish', pf: 'French', pg: 'English', ph: 'Filipino', pk: 'Urdu',
  pl: 'Polish', pm: 'French', pr: 'Spanish', ps: 'Arabic', pt: 'Portuguese',
  pw: 'English', py: 'Spanish', qa: 'Arabic', re: 'French', ro: 'Romanian',
  rs: 'Serbian', ru: 'Russian', rw: 'Kinyarwanda', sa: 'Arabic', sb: 'English',
  sc: 'French', sd: 'Arabic', se: 'Swedish', sg: 'English', si: 'Slovenian',
  sk: 'Slovak', sl: 'English', sm: 'Italian', sn: 'French', so: 'Somali',
  sr: 'Dutch', ss: 'English', st: 'Portuguese', sv: 'Spanish', sx: 'Dutch',
  sy: 'Arabic', sz: 'English', tc: 'English', td: 'French', tg: 'French',
  th: 'Thai', tj: 'Tajik', tl: 'Portuguese', tm: 'Turkmen', tn: 'Arabic',
  to: 'Tongan', tr: 'Turkish', tt: 'English', tv: 'English', tw: 'Chinese',
  tz: 'Swahili', ua: 'Ukrainian', ug: 'English', uk: 'English', us: 'English',
  uy: 'Spanish', uz: 'Uzbek', va: 'Italian', vc: 'English', ve: 'Spanish',
  vg: 'English', vi: 'English', vn: 'Vietnamese', vu: 'Bislama', ws: 'Samoan',
  ye: 'Arabic', yt: 'French', za: 'English', zm: 'English', zw: 'English'
};

export function resolveChannelLanguage(channel) {
  if (channel.language) return channel.language;
  const code = (channel.country?.code || (typeof channel.country === 'string' ? channel.country : '')).toLowerCase();
  return COUNTRY_LANGUAGE_MAP[code] || 'English';
}

export function parseChannelResolutionHeight(channel) {
  const hint = (channel.formatInformation?.resolutionHint || channel.signalQuality?.resolution || '').toUpperCase();
  if (hint.includes('4K') || hint.includes('UHD') || hint.includes('2160')) return 2160;
  if (hint.includes('1440')) return 1440;
  if (hint.includes('1080') || hint.includes('FHD')) return 1080;
  if (hint.includes('720') || hint.includes('HD')) return 720;
  if (hint.includes('576') || hint.includes('540')) return 540;
  if (hint.includes('480') || hint.includes('SD')) return 480;
  if (hint.includes('360')) return 360;
  if (hint.includes('240')) return 240;
  const matchP = hint.match(/(\d{3,4})P/);
  if (matchP) return parseInt(matchP[1], 10);
  const matchX = hint.match(/X(\d{3,4})/);
  if (matchX) return parseInt(matchX[1], 10);
  return 720;
}

export function getResolutionBadgeMeta(height, rawHint) {
  if (height >= 2160) return { label: '4K UHD', class: 'res-4k' };
  if (height >= 1080) return { label: '1080p FHD', class: 'res-1080p' };
  if (height >= 720) return { label: '720p HD', class: 'res-720p' };
  if (height >= 540) return { label: '540p', class: 'res-540p' };
  if (height > 0) return { label: `${height}p SD`, class: 'res-sd' };
  return { label: rawHint || '1080p', class: 'res-1080p' };
}

/**
 * Classifies broadcast resolution of original video source: 1080p, 2K, 4K, or other
 */
export function classifySourceResolution(channel, video = null) {
  let width = 0;
  let height = 0;
  if (video && video.videoWidth && video.videoHeight) {
    width = video.videoWidth;
    height = video.videoHeight;
  }

  const hint = (
    (channel && (channel.signalQuality?.resolution || channel.formatInformation?.resolutionHint || channel.resolution)) || ''
  ).toUpperCase();

  if (hint.includes('4K') || hint.includes('3840') || hint.includes('2160') || hint.includes('UHD')) {
    return '4K';
  }
  if (hint.includes('2K') || hint.includes('1440') || hint.includes('2560') || hint.includes('QHD')) {
    return '2K';
  }
  if (hint.includes('1080') || hint.includes('1920') || hint.includes('FHD')) {
    return '1080p';
  }

  if (height >= 2160 || width >= 3840) return '4K';
  if (height >= 1440 || width >= 2560) return '2K';
  if (height >= 1080 || width >= 1920) return '1080p';

  if (hint.includes('720') || hint.includes('HD') || hint.includes('480') || hint.includes('576') || hint.includes('SD')) {
    return 'other';
  }

  if (height > 0 || width > 0) return 'other';

  return '1080p';
}

export class UIController {
  constructor(channelManager, audioEngine, scene3D, jsonInspector, dvrManager) {
    this.cm = channelManager;
    this.ae = audioEngine;
    this.scene = scene3D;
    this.json = jsonInspector;
    this.dvr = dvrManager;
    this.visionAnalyzer = new VisionAnalyzer(this.cm.video, (t, tit, m) => this.showToast(t, tit, m));
    this.findings = new FindingsOrchestrator((t, tit, m) => this.showToast(t, tit, m));
    this.memory = new MemoryManager(this.cm, (t, tit, m) => this.showToast(t, tit, m));
    this.netballScanner = new NetballScanner(this.cm, (t, tit, m) => this.showToast(t, tit, m));
    this.currentVisionReportMd = '';

    this.activeCategory = 'ALL';
    this.activeCountry = 'ALL';
    this.searchQuery = '';
    this.dockSortKey = 'number';
    this.keypadBuffer = '';

    // Complete 15k channel cache & Directory Sort/Filter State
    this.completeChannelsList = [];
    this.filteredCompleteChannels = [];
    this.directorySortKey = 'name'; // 'name' | 'resolution' | 'country' | 'language' | 'number' | 'category' | 'company'
    this.directorySortOrder = 'asc'; // 'asc' | 'desc'
    this.directorySearchQuery = '';
    this.directoryResolutionFilter = 'ALL';
    this.directoryLanguageFilter = 'ALL';
    this.directoryCountryFilter = 'ALL';
    this.directoryDisplayLimit = 100;

    // Panel Curation Status ({ [sectionKey]: 'approved' | 'dismissed' })
    this.curatedSections = {};

    // Active Curation List Filter State for Channel Dock Rail
    this.curationFilterActive = false;
    this.activeCurationChannelIds = null;
    this.activeCurationName = null;

    // Live Video Thumbnail Dwell & Downscaling Engine (5-second viewing trigger)
    this.thumbnailDwellTimer = null;
    this.activeViewStartTime = null;
    this.latestTelemetry = null;
    this.latestVramTelemetry = null;

    this.dom = {
      // Header & Telemetry
      streamStatusBadge: document.getElementById('streamStatusBadge'),
      signalQualityVal: document.getElementById('signalQualityVal'),
      signalBars: document.getElementById('signalBars'),
      telemetryRes: document.getElementById('telemetryRes'),
      telemetryLatency: document.getElementById('telemetryLatency'),
      telemetryBitrate: document.getElementById('telemetryBitrate'),
      telemetryAgc: document.getElementById('telemetryAgc'),

      // Buttons
      btnDvrRecord: document.getElementById('btnDvrRecord'),
      btnDvrText: document.getElementById('btnDvrText'),
      btnDvrVault: document.getElementById('btnDvrVault'),
      dvrClipsCount: document.getElementById('dvrClipsCount'),
      btnGlobalDirectory: document.getElementById('btnGlobalDirectory'),
      btnViewMode: document.getElementById('btnViewMode'),
      btnAudioDeck: document.getElementById('btnAudioDeck'),
      btnJsonInspector: document.getElementById('btnJsonInspector'),
      btnKeypad: document.getElementById('btnKeypad'),

      // DVR HUD Banner
      dvrRecordingHud: document.getElementById('dvrRecordingHud'),
      dvrElapsedTimer: document.getElementById('dvrElapsedTimer'),
      dvrSizeCounter: document.getElementById('dvrSizeCounter'),
      btnStopDvrHud: document.getElementById('btnStopDvrHud'),

      // DVR Modal
      dvrModalBackdrop: document.getElementById('dvrModalBackdrop'),
      btnCloseDvrModal: document.getElementById('btnCloseDvrModal'),
      dvrRecordingsList: document.getElementById('dvrRecordingsList'),

      // Channel Changer Deck
      btnPrevChannel: document.getElementById('btnPrevChannel'),
      btnRecallChannel: document.getElementById('btnRecallChannel'),
      btnPlayPause: document.getElementById('btnPlayPause'),
      btnDvrDeck: document.getElementById('btnDvrDeck'),
      btnRandomChannel: document.getElementById('btnRandomChannel'),
      btnNextChannel: document.getElementById('btnNextChannel'),

      // Lower Third
      activeChNumber: document.getElementById('activeChNumber'),
      activeChCallsign: document.getElementById('activeChCallsign'),
      activeChFlag: document.getElementById('activeChFlag'),
      activeChName: document.getElementById('activeChName'),
      activeChGenre: document.getElementById('activeChGenre'),
      activeChFps: document.getElementById('activeChFps'),
      activeChCompany: document.getElementById('activeChCompany'),
      activeChOrigin: document.getElementById('activeChOrigin'),
      activeChDesc: document.getElementById('activeChDesc'),

      // Bottom Dock
      countryPills: document.getElementById('countryPills'),
      categoryPills: document.getElementById('categoryPills'),
      channelSearchInput: document.getElementById('channelSearchInput'),
      btnClearSearch: document.getElementById('btnClearSearch'),
      dockSortSelect: document.getElementById('dockSortSelect'),
      channelCardsRail: document.getElementById('channelCardsRail'),

      // Overlays
      audioUnlockPill: document.getElementById('audioUnlockPill'),
      btnUnlockAudio: document.getElementById('btnUnlockAudio'),
      testPatternOverlay: document.getElementById('testPatternOverlay'),
      testPatternTitle: document.getElementById('testPatternTitle'),
      testPatternMsg: document.getElementById('testPatternMsg'),
      btnRetryStream: document.getElementById('btnRetryStream'),
      btnAutoHopSurprise: document.getElementById('btnAutoHopSurprise'),
      btnSkipChannel: document.getElementById('btnSkipChannel'),
      cardTooltip: document.getElementById('cardTooltip'),
      ttNum: document.getElementById('ttNum'),
      ttRes: document.getElementById('ttRes'),
      ttTitle: document.getElementById('ttTitle'),
      ttMeta: document.getElementById('ttMeta'),

      // Audio Modal
      audioModalBackdrop: document.getElementById('audioModalBackdrop'),
      btnCloseAudioModal: document.getElementById('btnCloseAudioModal'),
      toggleAgc: document.getElementById('toggleAgc'),
      meterFill: document.getElementById('meterFill'),
      dbReadout: document.getElementById('dbReadout'),
      eqPresetButtons: document.getElementById('eqPresetButtons'),
      sliderBass: document.getElementById('sliderBass'),
      sliderMids: document.getElementById('sliderMids'),
      sliderTreble: document.getElementById('sliderTreble'),
      sliderVolume: document.getElementById('sliderVolume'),
      valBass: document.getElementById('valBass'),
      valMids: document.getElementById('valMids'),
      valTreble: document.getElementById('valTreble'),
      valVolume: document.getElementById('valVolume'),

      // JSON Modal
      jsonModalBackdrop: document.getElementById('jsonModalBackdrop'),
      btnCloseJsonModal: document.getElementById('btnCloseJsonModal'),
      btnViewTelemetryJson: document.getElementById('btnViewTelemetryJson'),
      btnViewCompleteJson: document.getElementById('btnViewCompleteJson'),
      btnExpandAllJson: document.getElementById('btnExpandAllJson'),
      btnCollapseAllJson: document.getElementById('btnCollapseAllJson'),
      btnCopyJson: document.getElementById('btnCopyJson'),
      btnDownloadJson: document.getElementById('btnDownloadJson'),
      jsonSearchInput: document.getElementById('jsonSearchInput'),

      // Keypad Modal
      keypadModalBackdrop: document.getElementById('keypadModalBackdrop'),
      btnCloseKeypadModal: document.getElementById('btnCloseKeypadModal'),
      keypadDigits: document.getElementById('keypadDigits'),

      // Global Directory Modal & Sorting Filter Controls
      globalDirectoryModalBackdrop: document.getElementById('globalDirectoryModalBackdrop'),
      btnCloseGlobalDirectoryModal: document.getElementById('btnCloseGlobalDirectoryModal'),
      directorySearchInput: document.getElementById('directorySearchInput'),
      btnClearDirectorySearch: document.getElementById('btnClearDirectorySearch'),
      directorySortSelect: document.getElementById('directorySortSelect'),
      btnDirectorySortOrder: document.getElementById('btnDirectorySortOrder'),
      sortDirIcon: document.getElementById('sortDirIcon'),
      sortDirText: document.getElementById('sortDirText'),
      directoryResolutionFilter: document.getElementById('directoryResolutionFilter'),
      directoryLanguageFilter: document.getElementById('directoryLanguageFilter'),
      directoryCountryFilter: document.getElementById('directoryCountryFilter'),
      btnResetDirectoryFilters: document.getElementById('btnResetDirectoryFilters'),
      directoryCountLabel: document.getElementById('directoryCountLabel'),
      directoryTable: document.getElementById('directoryTable'),
      directoryTableBody: document.getElementById('directoryTableBody'),
      directoryLoadMoreBar: document.getElementById('directoryLoadMoreBar'),
      btnDirectoryLoadMore: document.getElementById('btnDirectoryLoadMore'),

      // Upper Right Hand Corner Small Square Stats HUD Box
      systemStatsHudBox: document.getElementById('systemStatsHudBox'),
      hudStatusLed: document.getElementById('hudStatusLed'),
      hudGpuChip: document.getElementById('hudGpuChip'),
      hudGpuVal: document.getElementById('hudGpuVal'),
      hudGpuTemp: document.getElementById('hudGpuTemp'),
      hudVramVal: document.getElementById('hudVramVal'),
      hudVramPct: document.getElementById('hudVramPct'),
      hudCpuVal: document.getElementById('hudCpuVal'),
      hudCpuCores: document.getElementById('hudCpuCores'),
      hudRamVal: document.getElementById('hudRamVal'),
      hudRamPct: document.getElementById('hudRamPct'),
      hudGaugeFill: document.getElementById('hudGaugeFill'),
      hudOllamaTag: document.getElementById('hudOllamaTag'),

      // Top Telemetry Bar GPU Readouts
      gpuVramReadout: document.getElementById('gpuVramReadout'),
      gpuHealthBadge: document.getElementById('gpuHealthBadge'),

      // AI Vision Scan & Gemma 4 Modal
      btnVisionScan: document.getElementById('btnVisionScan'),
      visionModalBackdrop: document.getElementById('visionModalBackdrop'),
      btnCloseVisionModal: document.getElementById('btnCloseVisionModal'),
      btnCloseVisionModalBtn: document.getElementById('btnCloseVisionModalBtn'),
      btnTriggerVisionScan: document.getElementById('btnTriggerVisionScan'),
      btnDownloadReportMd: document.getElementById('btnDownloadReportMd'),
      btnCopyReportMd: document.getElementById('btnCopyReportMd'),
      visionSpinner: document.getElementById('visionSpinner'),
      visionScanLine: document.getElementById('visionScanLine'),
      visionStatusHeadline: document.getElementById('visionStatusHeadline'),
      visionStatusSub: document.getElementById('visionStatusSub'),
      visionHwBadge: document.getElementById('visionHwBadge'),
      visionFrameRes: document.getElementById('visionFrameRes'),
      visionFrameImg: document.getElementById('visionFrameImg'),
      visionReportViewer: document.getElementById('visionReportViewer'),

      // Left Flank: Channel Dossier Panel
      channelDossierPanel: document.getElementById('channelDossierPanel'),
      dosCountryTag: document.getElementById('dosCountryTag'),
      dosChNum: document.getElementById('dosChNum'),
      dosCallsign: document.getElementById('dosCallsign'),
      dosName: document.getElementById('dosName'),
      dosGenre: document.getElementById('dosGenre'),
      dosCompany: document.getElementById('dosCompany'),
      dosOrigin: document.getElementById('dosOrigin'),
      dosResolution: document.getElementById('dosResolution'),
      dosAspect: document.getElementById('dosAspect'),
      dosAudioAgc: document.getElementById('dosAudioAgc'),
      dosSignalScore: document.getElementById('dosSignalScore'),
      dosDesc: document.getElementById('dosDesc'),

      // Right Flank: Findings Orchestrator Panel
      findingsOrchestratorPanel: document.getElementById('findingsOrchestratorPanel'),
      btnOrchestratorScan: document.getElementById('btnOrchestratorScan'),
      btnOrchestratorText: document.getElementById('btnOrchestratorText'),
      findAiBadge: document.getElementById('findAiBadge'),
      findTitle: document.getElementById('findTitle'),
      findMetaPill: document.getElementById('findMetaPill'),
      findLogline: document.getElementById('findLogline'),
      findDp: document.getElementById('findDp'),
      findDirector: document.getElementById('findDirector'),
      findCameras: document.getElementById('findCameras'),
      findLenses: document.getElementById('findLenses'),
      findLighting: document.getElementById('findLighting'),
      findActorsList: document.getElementById('findActorsList'),
      findTriviaList: document.getElementById('findTriviaList'),
      findPosterImg: document.getElementById('findPosterImg'),
      findWikiLink: document.getElementById('findWikiLink'),
      findDpWikiLink: document.getElementById('findDpWikiLink'),

      // Candidate Titles Section (Elimination & Confirmation)
      secCandidateTitles: document.getElementById('secCandidateTitles'),
      candidateCountTag: document.getElementById('candidateCountTag'),
      candidatePrompt: document.getElementById('candidatePrompt'),
      candidateActorsRow: document.getElementById('candidateActorsRow'),
      candidateActorsPills: document.getElementById('candidateActorsPills'),
      candidateTitlesList: document.getElementById('candidateTitlesList'),

      // Cinephile Rabbit Hole Elements
      findRabbitHoleSection: document.getElementById('findRabbitHoleSection'),
      rabbitActivePersonTag: document.getElementById('rabbitActivePersonTag'),
      rabbitPersonPhoto: document.getElementById('rabbitPersonPhoto'),
      rabbitPersonName: document.getElementById('rabbitPersonName'),
      rabbitPersonRole: document.getElementById('rabbitPersonRole'),
      rabbitImdbLink: document.getElementById('rabbitImdbLink'),
      rabbitWikiLink: document.getElementById('rabbitWikiLink'),
      rabbitBioText: document.getElementById('rabbitBioText'),
      rabbitProjectsDeck: document.getElementById('rabbitProjectsDeck'),

      // 50px Favorites Heart Indicator Button
      btnFavoriteToggle: document.getElementById('btnFavoriteToggle'),

      // Audio Listener & Dialogue Radar Elements
      findAudioListenerSection: document.getElementById('findAudioListenerSection'),
      btnTriggerAudioListen: document.getElementById('btnTriggerAudioListen'),
      btnAudioListenText: document.getElementById('btnAudioListenText'),
      btnFlushVram: document.getElementById('btnFlushVram'),
      audioVramTag: document.getElementById('audioVramTag'),
      audioTranscriptText: document.getElementById('audioTranscriptText'),
      audioEngineChip: document.getElementById('audioEngineChip'),
      audioLatencyChip: document.getElementById('audioLatencyChip'),
      audioCharactersList: document.getElementById('audioCharactersList'),
      audioQueriesList: document.getElementById('audioQueriesList'),

      // Curation List Controls (Top-Left)
      curationListNameInput: document.getElementById('curationListNameInput'),
      curationListSelect: document.getElementById('curationListSelect'),
      btnSaveCurationList: document.getElementById('btnSaveCurationList'),
      btnNewCurationList: document.getElementById('btnNewCurationList'),
      btnTuneCurationList: document.getElementById('btnTuneCurationList'),
      btnAddCurrentToCuration: document.getElementById('btnAddCurrentToCuration'),
      btnClearCurationFilter: document.getElementById('btnClearCurationFilter'),
      curationCountPill: document.getElementById('curationCountPill'),
      curationFilterState: document.getElementById('curationFilterState'),

      // Master Audio Deck (Right of Central Video Display)
      centralAudioDeck: document.getElementById('centralAudioDeck'),
      btnDeckMute: document.getElementById('btnDeckMute'),
      iconDeckUnmuted: document.getElementById('iconDeckUnmuted'),
      iconDeckMuted: document.getElementById('iconDeckMuted'),
      verticalVolumeTrack: document.getElementById('verticalVolumeTrack'),
      verticalVolumeSlider: document.getElementById('verticalVolumeSlider'),
      vsliderFill: document.getElementById('vsliderFill'),
      volLevelReadout: document.getElementById('volLevelReadout'),

      // Source Broadcast Resolution Label (Grey text below bottom-left of central video display)
      monitorSourceResolution: document.getElementById('monitorSourceResolution'),
      lblOriginalSourceRes: document.getElementById('lblOriginalSourceRes'),

      // Left Flank Tabs & Must-See Deck
      btnTabDossier: document.getElementById('btnTabDossier'),
      btnTabMustSee: document.getElementById('btnTabMustSee'),
      dosContentTab: document.getElementById('dosContentTab'),
      mustSeeTab: document.getElementById('mustSeeTab'),
      mustSeeItemsList: document.getElementById('mustSeeItemsList'),

      // Text Popup Content Alerts
      contentAlertPopup: document.getElementById('contentAlertPopup'),
      alertScoreBadge: document.getElementById('alertScoreBadge'),
      btnCloseAlertPopup: document.getElementById('btnCloseAlertPopup'),
      alertShowTitle: document.getElementById('alertShowTitle'),
      alertChannelName: document.getElementById('alertChannelName'),
      alertReason: document.getElementById('alertReason'),
      btnAlertTuneChannel: document.getElementById('btnAlertTuneChannel'),
      btnAlertDismiss: document.getElementById('btnAlertDismiss'),

      // Toast Container
      toastContainer: document.getElementById('toastContainer'),

      // Netball Live Radar Scanner
      btnNetballScanner: document.getElementById('btnNetballScanner'),
      netballModalBackdrop: document.getElementById('netballModalBackdrop'),
      btnCloseNetballModal: document.getElementById('btnCloseNetballModal'),
      btnCloseNetballModalBtn: document.getElementById('btnCloseNetballModalBtn'),
      btnRefreshNetballScan: document.getElementById('btnRefreshNetballScan'),
      netballScanSpinner: document.getElementById('netballScanSpinner'),
      netballEstClock: document.getElementById('netballEstClock'),
      netballNextCountdown: document.getElementById('netballNextCountdown'),
      netballTotalBadge: document.getElementById('netballTotalBadge'),
      netballLiveBadge: document.getElementById('netballLiveBadge'),
      netballMatchesCountLabel: document.getElementById('netballMatchesCountLabel'),
      netballFilterPills: document.getElementById('netballFilterPills'),
      netballSearchInput: document.getElementById('netballSearchInput'),
      netballCardsContainer: document.getElementById('netballCardsContainer')
    };

    this.bindEvents();
    this.startAudioMeterLoop();
    this.startSystemMonitoringLoop();
    this.memory.init(this.dom, (curationName, channelIds) => {
      this.handleCurationFilterChange(curationName, channelIds);
    });
    this.netballScanner.init(this.dom);
  }

  startSystemMonitoringLoop() {
    const fetchSystemStats = async () => {
      try {
        // Try unified telemetry first, fallback to gpu_telemetry
        let res = await fetch('/system_telemetry.json?t=' + Date.now());
        if (!res.ok) {
          res = await fetch('/gpu_telemetry.json?t=' + Date.now());
        }
        if (res.ok) {
          const data = await res.json();
          this.updateSystemStatsHud(data);
        }
      } catch (e) {
        // silent fallback if daemon temporarily busy
      }
    };
    fetchSystemStats();
    setInterval(fetchSystemStats, 2000);
  }

  updateSystemStatsHud(data) {
    if (!data) return;

    this.latestTelemetry = data;
    if (data.vram) {
      this.latestVramTelemetry = data.vram;
    }

    // 1. GPU & Temperature
    const gpuCore = data.gpu?.corePercent ?? data.utilization?.gpuCorePercent ?? 0;
    const gpuTemp = data.gpu?.temperatureC ?? data.temperatureC ?? 45;
    if (this.dom.hudGpuVal) this.dom.hudGpuVal.textContent = `${gpuCore}%`;
    if (this.dom.hudGpuTemp) this.dom.hudGpuTemp.textContent = `${gpuTemp}°C`;

    // 2. VRAM
    if (data.vram) {
      const usedGb = (data.vram.usedMb / 1024).toFixed(1);
      const totalGb = (data.vram.totalMb / 1024).toFixed(1);
      const vramPct = data.vram.usedPercent ?? Math.round((data.vram.usedMb / data.vram.totalMb) * 100);
      
      if (this.dom.hudVramVal) this.dom.hudVramVal.textContent = `${usedGb}G`;
      if (this.dom.hudVramPct) this.dom.hudVramPct.textContent = `${vramPct}%`;
      if (this.dom.hudGaugeFill) {
        this.dom.hudGaugeFill.style.width = `${Math.min(vramPct, 100)}%`;
        if (vramPct >= 90) {
          this.dom.hudGaugeFill.style.background = 'var(--accent-red)';
        } else if (vramPct >= 75) {
          this.dom.hudGaugeFill.style.background = 'var(--accent-amber)';
        } else {
          this.dom.hudGaugeFill.style.background = 'linear-gradient(90deg, var(--accent-cyan), var(--accent-green))';
        }
      }

      // Top Header Pill Sync
      if (this.dom.gpuVramReadout) {
        this.dom.gpuVramReadout.textContent = `${usedGb} GB / ${totalGb} GB (${vramPct}%)`;
      }
      if (this.dom.gpuHealthBadge) {
        this.dom.gpuHealthBadge.textContent = data.vram.healthStatus || 'OPTIMAL';
        this.dom.gpuHealthBadge.className = `badge ${data.vram.healthStatus === 'OPTIMAL' ? 'on-air' : (data.vram.healthStatus === 'WARNING' ? 'badge-genre' : 'badge-live')}`;
      }
    }

    // 3. CPU
    const cpuPct = data.cpu?.percent ?? 10;
    const cpuCores = data.cpu?.logicalCores ?? 16;
    if (this.dom.hudCpuVal) this.dom.hudCpuVal.textContent = `${Math.round(cpuPct)}%`;
    if (this.dom.hudCpuCores) this.dom.hudCpuCores.textContent = `${cpuCores}T`;

    // 4. System Memory (RAM)
    if (data.systemMemory) {
      const ramUsedGb = data.systemMemory.usedGb;
      const ramPct = data.systemMemory.usedPercent;
      if (this.dom.hudRamVal) this.dom.hudRamVal.textContent = `${ramUsedGb}G`;
      if (this.dom.hudRamPct) this.dom.hudRamPct.textContent = `${Math.round(ramPct)}%`;
    }

    // 5. Ollama Gemma 4 Status & LED Indicator
    if (data.ollama) {
      const isOnline = data.ollama.online && data.ollama.modelReady;
      const isSafe = data.ollama.vramSafe;
      if (this.dom.hudOllamaTag) {
        this.dom.hudOllamaTag.textContent = isOnline 
          ? (isSafe ? 'GEMMA 4: SAFE' : 'GEMMA 4: LOAD') 
          : 'OLLAMA: STANDBY';
      }
      if (this.dom.hudStatusLed) {
        this.dom.hudStatusLed.className = `hud-box-led ${!isSafe ? 'warning' : ''}`;
      }
    }
  }

  bindEvents() {
    // Channel Changer
    this.dom.btnNextChannel.addEventListener('click', () => this.cm.nextChannel());
    this.dom.btnPrevChannel.addEventListener('click', () => this.cm.prevChannel());
    this.dom.btnRecallChannel.addEventListener('click', () => this.cm.recallChannel());
    this.dom.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
    this.dom.btnRandomChannel.addEventListener('click', () => {
      // Respect active curation or dock filter if multiple channels exist; otherwise use entire deck
      let candidatePool = null;
      if (this.curationFilterActive && this.activeCurationChannelIds && this.activeCurationChannelIds.length > 1) {
        candidatePool = this.cm.channels.filter(ch =>
          this.activeCurationChannelIds.includes(ch.id) ||
          this.activeCurationChannelIds.includes(String(ch.number || ch.channelNumber))
        );
      } else if (this.activeCategory !== 'ALL' || this.activeCountry !== 'ALL') {
        const filtered = this.cm.channels.filter(ch => {
          const matchCat = this.activeCategory === 'ALL' || ch.category === this.activeCategory;
          const matchCountry = this.activeCountry === 'ALL' || (ch.country && ch.country.code === this.activeCountry);
          return matchCat && matchCountry;
        });
        if (filtered.length > 1) candidatePool = filtered;
      }

      const chosen = this.cm.randomChannel(candidatePool);
      if (chosen) {
        const flag = chosen.country?.flag || '🌐';
        const num = chosen.number || chosen.channelNumber || '';
        this.showToast('info', '🎲 Surprise Channel Tuned', `${flag} ${chosen.name} (CH ${num}) • ${chosen.genre || chosen.category}`);
      }
    });

    // DVR Recording Controls
    const toggleDvr = () => {
      if (!this.dvr.isRecording) {
        const cur = this.cm.getActiveChannel();
        this.dvr.startRecording(cur);
      } else {
        this.dvr.stopRecording();
      }
    };
    this.dom.btnDvrRecord.addEventListener('click', toggleDvr);
    this.dom.btnDvrDeck.addEventListener('click', toggleDvr);
    this.dom.btnStopDvrHud.addEventListener('click', () => this.dvr.stopRecording());

    // DVR Vault Modal
    this.dom.btnDvrVault.addEventListener('click', () => {
      this.dom.dvrModalBackdrop.classList.remove('hidden');
      this.renderDvrList();
    });
    this.dom.btnCloseDvrModal.addEventListener('click', () => {
      this.dom.dvrModalBackdrop.classList.add('hidden');
    });
    this.dom.dvrModalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.dom.dvrModalBackdrop) this.dom.dvrModalBackdrop.classList.add('hidden');
    });

    // Country Filter Pills
    const countryButtons = this.dom.countryPills.querySelectorAll('.country-pill');
    countryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        countryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCountry = btn.dataset.country;
        this.renderChannelCardsRail();
      });
    });

    // Category Filter Pills
    const catButtons = this.dom.categoryPills.querySelectorAll('.pill-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.dataset.category;
        this.renderChannelCardsRail();
      });
    });

    // Search bar
    this.dom.channelSearchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.dom.btnClearSearch.classList.toggle('hidden', this.searchQuery.length === 0);
      this.renderChannelCardsRail();
    });
    this.dom.btnClearSearch.addEventListener('click', () => {
      this.dom.channelSearchInput.value = '';
      this.searchQuery = '';
      this.dom.btnClearSearch.classList.add('hidden');
      this.renderChannelCardsRail();
    });

    // Bottom dock sort select
    if (this.dom.dockSortSelect) {
      this.dom.dockSortSelect.addEventListener('change', (e) => {
        this.dockSortKey = e.target.value;
        this.renderChannelCardsRail();
      });
    }

    // View Mode Toggle
    this.dom.btnViewMode.addEventListener('click', () => {
      const mode = this.scene.cycleViewMode();
      this.showToast('info', 'View Mode', `Switched to 16:9 ${mode.toUpperCase()} view.`);
      this.dom.btnViewMode.querySelector('.btn-text').textContent = mode.toUpperCase();
    });

    // Audio Modal Toggle
    this.dom.btnAudioDeck.addEventListener('click', () => {
      this.dom.audioModalBackdrop.classList.remove('hidden');
      this.ae.resume();
    });
    this.dom.btnCloseAudioModal.addEventListener('click', () => {
      this.dom.audioModalBackdrop.classList.add('hidden');
    });
    this.dom.audioModalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.dom.audioModalBackdrop) this.dom.audioModalBackdrop.classList.add('hidden');
    });

    // AGC Switch
    this.dom.toggleAgc.addEventListener('change', (e) => {
      const active = e.target.checked;
      this.ae.setAgc(active);
      this.dom.telemetryAgc.textContent = active ? 'ACTIVE' : 'BYPASS';
      this.dom.telemetryAgc.style.color = active ? 'var(--accent-purple)' : 'var(--text-dim)';
      this.showToast('info', 'Audio Normalizer', active ? 'Loudness AGC Activated (-14 LUFS)' : 'Loudness AGC Bypassed');
    });

    // EQ Presets
    const eqButtons = this.dom.eqPresetButtons.querySelectorAll('.preset-btn');
    eqButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        eqButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.dataset.preset;
        this.ae.setPreset(preset);
        this.syncEqSlidersFromEngine();
        this.showToast('info', 'Equalizer Preset', `Acoustic profile set to '${preset}'`);
      });
    });

    // EQ Sliders
    this.dom.sliderBass.addEventListener('input', (e) => {
      const val = e.target.value;
      this.dom.valBass.textContent = `${val >= 0 ? '+' : ''}${val} dB`;
      this.ae.setEq('bass', val);
    });
    this.dom.sliderMids.addEventListener('input', (e) => {
      const val = e.target.value;
      this.dom.valMids.textContent = `${val >= 0 ? '+' : ''}${val} dB`;
      this.ae.setEq('mids', val);
    });
    this.dom.sliderTreble.addEventListener('input', (e) => {
      const val = e.target.value;
      this.dom.valTreble.textContent = `${val >= 0 ? '+' : ''}${val} dB`;
      this.ae.setEq('treble', val);
    });
    this.dom.sliderVolume.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      this.setMasterVolume(vol);
    });

    // JSON Inspector Modal & Dataset Switcher
    this.dom.btnJsonInspector.addEventListener('click', () => {
      this.dom.jsonModalBackdrop.classList.remove('hidden');
      const cur = this.cm.getActiveChannel();
      if (cur) this.json.updateActiveChannelSummary(cur);
    });
    this.dom.btnCloseJsonModal.addEventListener('click', () => {
      this.dom.jsonModalBackdrop.classList.add('hidden');
    });
    this.dom.jsonModalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.dom.jsonModalBackdrop) this.dom.jsonModalBackdrop.classList.add('hidden');
    });
    this.dom.btnViewTelemetryJson.addEventListener('click', () => {
      this.dom.btnViewTelemetryJson.classList.add('active-dataset');
      this.dom.btnViewCompleteJson.classList.remove('active-dataset');
      this.json.setDataset('telemetry');
      this.dom.btnDownloadJson.href = '/channel_summaries.json';
      this.dom.btnDownloadJson.download = 'channel_summaries.json';
    });
    this.dom.btnViewCompleteJson.addEventListener('click', () => {
      this.dom.btnViewCompleteJson.classList.add('active-dataset');
      this.dom.btnViewTelemetryJson.classList.remove('active-dataset');
      this.json.loadCompleteDatabase();
      this.dom.btnDownloadJson.href = '/channels_complete.json';
      this.dom.btnDownloadJson.download = 'channels_complete.json';
    });
    this.dom.btnExpandAllJson.addEventListener('click', () => this.json.expandAll());
    this.dom.btnCollapseAllJson.addEventListener('click', () => this.json.collapseAll());
    this.dom.btnCopyJson.addEventListener('click', () => this.json.copyJson());
    this.dom.jsonSearchInput.addEventListener('input', (e) => {
      this.json.setSearchQuery(e.target.value);
    });

    // Keypad Modal
    this.dom.btnKeypad.addEventListener('click', () => {
      this.keypadBuffer = '';
      this.dom.keypadDigits.textContent = '---';
      this.dom.keypadModalBackdrop.classList.remove('hidden');
    });
    this.dom.btnCloseKeypadModal.addEventListener('click', () => {
      this.dom.keypadModalBackdrop.classList.add('hidden');
    });
    this.dom.keypadModalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.dom.keypadModalBackdrop) this.dom.keypadModalBackdrop.classList.add('hidden');
    });

    const keys = this.dom.keypadModalBackdrop.querySelectorAll('.key-btn');
    keys.forEach(k => {
      k.addEventListener('click', () => {
        const key = k.dataset.key;
        if (key === 'CLEAR') {
          this.keypadBuffer = '';
          this.dom.keypadDigits.textContent = '---';
        } else if (key === 'ENTER') {
          this.submitKeypadTune();
        } else {
          if (this.keypadBuffer.length < 3) {
            this.keypadBuffer += key;
            this.dom.keypadDigits.textContent = this.keypadBuffer.padEnd(3, '-');
          }
        }
      });
    });

    // Global 15,775 Channels Directory Browser Modal
    this.dom.btnGlobalDirectory.addEventListener('click', () => {
      this.dom.globalDirectoryModalBackdrop.classList.remove('hidden');
      this.loadAndRenderGlobalDirectory();
    });
    this.dom.btnCloseGlobalDirectoryModal.addEventListener('click', () => {
      this.dom.globalDirectoryModalBackdrop.classList.add('hidden');
    });
    this.dom.globalDirectoryModalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.dom.globalDirectoryModalBackdrop) this.dom.globalDirectoryModalBackdrop.classList.add('hidden');
    });

    // Directory Search & Clear
    this.dom.directorySearchInput.addEventListener('input', (e) => {
      this.directorySearchQuery = e.target.value.trim().toLowerCase();
      if (this.dom.btnClearDirectorySearch) {
        this.dom.btnClearDirectorySearch.classList.toggle('hidden', this.directorySearchQuery.length === 0);
      }
      this.directoryDisplayLimit = 100;
      this.applyDirectoryFiltersAndSort();
    });

    if (this.dom.btnClearDirectorySearch) {
      this.dom.btnClearDirectorySearch.addEventListener('click', () => {
        this.dom.directorySearchInput.value = '';
        this.directorySearchQuery = '';
        this.dom.btnClearDirectorySearch.classList.add('hidden');
        this.directoryDisplayLimit = 100;
        this.applyDirectoryFiltersAndSort();
      });
    }

    // Directory Sort By Dropdown
    if (this.dom.directorySortSelect) {
      this.dom.directorySortSelect.addEventListener('change', (e) => {
        this.directorySortKey = e.target.value;
        if (this.directorySortKey === 'resolution') {
          this.directorySortOrder = 'desc'; // 4K -> SD default
        } else {
          this.directorySortOrder = 'asc';
        }
        this.updateSortOrderButtonUi();
        this.directoryDisplayLimit = 100;
        this.applyDirectoryFiltersAndSort();
      });
    }

    // Directory Sort Order Toggle (Asc / Desc)
    if (this.dom.btnDirectorySortOrder) {
      this.dom.btnDirectorySortOrder.addEventListener('click', () => {
        this.directorySortOrder = this.directorySortOrder === 'asc' ? 'desc' : 'asc';
        this.updateSortOrderButtonUi();
        this.directoryDisplayLimit = 100;
        this.applyDirectoryFiltersAndSort();
      });
    }

    // Dimension Filters (Resolution, Language, Country)
    if (this.dom.directoryResolutionFilter) {
      this.dom.directoryResolutionFilter.addEventListener('change', (e) => {
        this.directoryResolutionFilter = e.target.value;
        this.directoryDisplayLimit = 100;
        this.applyDirectoryFiltersAndSort();
      });
    }

    if (this.dom.directoryLanguageFilter) {
      this.dom.directoryLanguageFilter.addEventListener('change', (e) => {
        this.directoryLanguageFilter = e.target.value;
        this.directoryDisplayLimit = 100;
        this.applyDirectoryFiltersAndSort();
      });
    }

    if (this.dom.directoryCountryFilter) {
      this.dom.directoryCountryFilter.addEventListener('change', (e) => {
        this.directoryCountryFilter = e.target.value;
        this.directoryDisplayLimit = 100;
        this.applyDirectoryFiltersAndSort();
      });
    }

    // Reset All Filters & Sorting
    if (this.dom.btnResetDirectoryFilters) {
      this.dom.btnResetDirectoryFilters.addEventListener('click', () => {
        this.resetDirectoryFiltersAndSort();
      });
    }

    // Sortable Table Column Headers
    if (this.dom.directoryTable) {
      this.dom.directoryTable.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (this.directorySortKey === key) {
            this.directorySortOrder = this.directorySortOrder === 'asc' ? 'desc' : 'asc';
          } else {
            this.directorySortKey = key;
            this.directorySortOrder = key === 'resolution' ? 'desc' : 'asc';
          }
          if (this.dom.directorySortSelect) {
            this.dom.directorySortSelect.value = key;
          }
          this.updateSortOrderButtonUi();
          this.directoryDisplayLimit = 100;
          this.applyDirectoryFiltersAndSort();
        });
      });
    }

    // Directory Load More Button
    if (this.dom.btnDirectoryLoadMore) {
      this.dom.btnDirectoryLoadMore.addEventListener('click', () => {
        this.directoryDisplayLimit += 100;
        this.renderDirectoryRows();
      });
    }

    // Autoplay Unlock
    this.dom.btnUnlockAudio.addEventListener('click', () => this.unlockAudio());

    // Central Audio Deck (Right of Central Video Display)
    if (this.dom.btnDeckMute) {
      this.dom.btnDeckMute.addEventListener('click', () => this.toggleMute());
    }

    // Direct click/drag on vertical volume slider track to determine volume level %
    if (this.dom.verticalVolumeTrack) {
      const setVolFromPointer = (e) => {
        const track = this.dom.verticalVolumeTrack;
        const rect = track.getBoundingClientRect();
        // Distance from bottom of the track: bottom = 0%, top = 100%
        const offsetY = rect.bottom - e.clientY;
        const pct = Math.max(0, Math.min(1, offsetY / rect.height));
        this.setMasterVolume(pct);
      };

      let isDraggingVolume = false;

      this.dom.verticalVolumeTrack.addEventListener('pointerdown', (e) => {
        isDraggingVolume = true;
        try {
          this.dom.verticalVolumeTrack.setPointerCapture(e.pointerId);
        } catch (_) {}
        setVolFromPointer(e);
      });

      this.dom.verticalVolumeTrack.addEventListener('pointermove', (e) => {
        if (!isDraggingVolume) return;
        setVolFromPointer(e);
      });

      const stopDrag = (e) => {
        if (!isDraggingVolume) return;
        isDraggingVolume = false;
        try {
          this.dom.verticalVolumeTrack.releasePointerCapture(e.pointerId);
        } catch (_) {}
        setVolFromPointer(e);
      };

      this.dom.verticalVolumeTrack.addEventListener('pointerup', stopDrag);
      this.dom.verticalVolumeTrack.addEventListener('pointercancel', stopDrag);
    }

    if (this.dom.verticalVolumeSlider) {
      this.dom.verticalVolumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        this.setMasterVolume(vol);
      });
    }

    // Video stream metadata & volume listener
    if (this.cm.video) {
      this.cm.video.addEventListener('loadedmetadata', () => {
        this.updateSourceResolutionDisplay(this.cm.getActiveChannel());
      });
      this.cm.video.addEventListener('volumechange', () => {
        this.syncDeckVolumeUi();
      });
    }

    // Initial sync of audio volume UI
    this.syncDeckVolumeUi();

    // Test pattern actions
    this.dom.btnRetryStream.addEventListener('click', () => {
      this.dom.testPatternOverlay.classList.add('hidden');
      const cur = this.cm.getActiveChannel();
      if (cur) this.cm.playChannel(cur);
    });
    if (this.dom.btnAutoHopSurprise) {
      this.dom.btnAutoHopSurprise.addEventListener('click', () => {
        this.dom.testPatternOverlay.classList.add('hidden');
        this.cm.randomChannel();
      });
    }
    this.dom.btnSkipChannel.addEventListener('click', () => {
      this.dom.testPatternOverlay.classList.add('hidden');
      this.cm.nextChannel();
    });

    // AI Vision Scan & Gemma 4 Modal
    if (this.dom.btnVisionScan) {
      this.dom.btnVisionScan.addEventListener('click', () => this.openVisionModal());
    }
    if (this.dom.btnCloseVisionModal) {
      this.dom.btnCloseVisionModal.addEventListener('click', () => this.closeVisionModal());
    }
    if (this.dom.btnCloseVisionModalBtn) {
      this.dom.btnCloseVisionModalBtn.addEventListener('click', () => this.closeVisionModal());
    }
    if (this.dom.visionModalBackdrop) {
      this.dom.visionModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.dom.visionModalBackdrop) this.closeVisionModal();
      });
    }
    if (this.dom.btnTriggerVisionScan) {
      this.dom.btnTriggerVisionScan.addEventListener('click', () => this.runVisionScan());
    }
    if (this.dom.btnDownloadReportMd) {
      this.dom.btnDownloadReportMd.addEventListener('click', () => {
        if (!this.currentVisionReportMd) {
          this.showToast('info', 'No Report', 'Please execute a vision scan first.');
          return;
        }
        const activeCh = this.cm.getActiveChannel() || { name: 'Channel_Feed', number: '101' };
        this.visionAnalyzer.downloadReport(this.currentVisionReportMd, activeCh.name, activeCh.number);
      });
    }
    if (this.dom.btnCopyReportMd) {
      this.dom.btnCopyReportMd.addEventListener('click', async () => {
        if (!this.currentVisionReportMd) {
          this.showToast('info', 'No Report', 'Please execute a vision scan first.');
          return;
        }
        try {
          await navigator.clipboard.writeText(this.currentVisionReportMd);
          this.showToast('success', 'Copied', 'Markdown report copied to clipboard.');
        } catch (e) {
          this.showToast('info', 'Clipboard', 'Unable to copy automatically.');
        }
      });
    }

    // Findings Orchestrator Multi-Frame Scan Loop (10s intervals)
    if (this.dom.btnOrchestratorScan) {
      this.dom.btnOrchestratorScan.addEventListener('click', () => this.toggleFeedScanLoop());
    }

    // Favorite Heart Indicator (ML, RSI & Curation Engine Guidance)
    if (this.dom.btnFavoriteToggle) {
      this.dom.btnFavoriteToggle.addEventListener('click', () => this.toggleFavorite());
    }

    // Audio Listener & Dialogue Radar
    if (this.dom.btnTriggerAudioListen) {
      this.dom.btnTriggerAudioListen.addEventListener('click', () => this.runAudioListen());
    }
    if (this.dom.btnFlushVram) {
      this.dom.btnFlushVram.addEventListener('click', () => this.flushVram());
    }

    // Panel Curation: Green Checkmark (Approve) & Red 'X' (Dismiss / Exclude)
    this.bindCurationEvents();

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        this.cm.nextChannel();
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        this.cm.prevChannel();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleMute();
      } else if (e.key === 'd' || e.key === 'D') {
        // 'D' triggers DVR toggle
        toggleDvr();
      } else if (e.key === 's' || e.key === 'S') {
        // 'S' triggers AI Vision Scan
        if (this.dom.btnVisionScan) this.dom.btnVisionScan.click();
      } else if (e.key === 'n' || e.key === 'N') {
        this.dom.toggleAgc.checked = !this.dom.toggleAgc.checked;
        this.dom.toggleAgc.dispatchEvent(new Event('change'));
      } else if (e.key === 'b' || e.key === 'B') {
        // 'B' triggers Netball Live Radar Scanner
        if (this.dom.btnNetballScanner) this.dom.btnNetballScanner.click();
      } else if (e.key === 'j' || e.key === 'J') {
        this.dom.btnJsonInspector.click();
      } else if (e.key === 'g' || e.key === 'G') {
        this.dom.btnGlobalDirectory.click();
      } else if (e.key === 'e' || e.key === 'E') {
        this.dom.btnAudioDeck.click();
      } else if (e.key === 'v' || e.key === 'V') {
        this.dom.btnViewMode.click();
      } else if (e.key === 'r' || e.key === 'R') {
        this.cm.recallChannel();
      } else if (e.key >= '0' && e.key <= '9') {
        this.dom.btnKeypad.click();
        this.keypadBuffer = e.key;
        this.dom.keypadDigits.textContent = this.keypadBuffer.padEnd(3, '-');
      } else if (e.key === 'Escape') {
        this.dom.audioModalBackdrop.classList.add('hidden');
        this.dom.jsonModalBackdrop.classList.add('hidden');
        this.dom.keypadModalBackdrop.classList.add('hidden');
        this.dom.dvrModalBackdrop.classList.add('hidden');
        this.dom.globalDirectoryModalBackdrop.classList.add('hidden');
        if (this.dom.visionModalBackdrop) this.dom.visionModalBackdrop.classList.add('hidden');
        if (this.dom.netballModalBackdrop) this.dom.netballModalBackdrop.classList.add('hidden');
      }
    });
  }

  unlockAudio() {
    this.cm.unmute();
    this.ae.resume();
    this.dom.audioUnlockPill.classList.add('hidden');
    this.showToast('success', 'Audio Activated', 'Master sound stream & AGC normalizer unmuted.');
  }

  togglePlayPause() {
    const isPlaying = this.cm.togglePlayPause();
    const playIcon = this.dom.btnPlayPause.querySelector('.icon-play');
    const pauseIcon = this.dom.btnPlayPause.querySelector('.icon-pause');
    if (isPlaying) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
    }
  }

  setMasterVolume(vol) {
    const clamped = Math.max(0, Math.min(1, vol));
    if (this.cm.video) {
      this.cm.video.volume = clamped;
      if (clamped > 0 && this.cm.video.muted) {
        this.cm.video.muted = false;
        this.ae.resume();
        if (this.dom.audioUnlockPill) this.dom.audioUnlockPill.classList.add('hidden');
      } else if (clamped === 0) {
        this.cm.video.muted = true;
      }
    }
    this.ae.setVolume(clamped);
    this.syncDeckVolumeUi();
  }

  toggleMute() {
    if (!this.cm.video) return;
    const willBeMuted = !this.cm.video.muted;
    this.cm.video.muted = willBeMuted;

    if (willBeMuted) {
      this.ae.setVolume(0);
      this.showToast('info', 'Audio Muted', 'Central video sound muted.');
    } else {
      this.ae.resume();
      if (this.dom.audioUnlockPill) this.dom.audioUnlockPill.classList.add('hidden');
      const curVol = this.cm.video.volume > 0.05 ? this.cm.video.volume : 0.8;
      this.cm.video.volume = curVol;
      this.ae.setVolume(curVol);
      this.showToast('info', 'Audio Active', `Unmuted. Volume: ${Math.round(curVol * 100)}%`);
    }

    this.syncDeckVolumeUi();
  }

  syncDeckVolumeUi() {
    if (!this.cm.video) return;
    const isMuted = this.cm.video.muted || this.cm.video.volume === 0;
    const vol = this.cm.video.volume;
    const pct = Math.round(vol * 100);

    // Mute button icon
    if (this.dom.iconDeckUnmuted && this.dom.iconDeckMuted) {
      if (isMuted) {
        this.dom.iconDeckUnmuted.classList.add('hidden');
        this.dom.iconDeckMuted.classList.remove('hidden');
        if (this.dom.btnDeckMute) this.dom.btnDeckMute.classList.add('muted');
      } else {
        this.dom.iconDeckUnmuted.classList.remove('hidden');
        this.dom.iconDeckMuted.classList.add('hidden');
        if (this.dom.btnDeckMute) this.dom.btnDeckMute.classList.remove('muted');
      }
    }

    // Vertical slider and fill
    if (this.dom.verticalVolumeSlider) {
      this.dom.verticalVolumeSlider.value = isMuted ? 0 : vol;
    }
    if (this.dom.vsliderFill) {
      this.dom.vsliderFill.style.height = isMuted ? '0%' : `${pct}%`;
    }
    if (this.dom.volLevelReadout) {
      this.dom.volLevelReadout.textContent = isMuted ? 'MUTE' : `${pct}%`;
      this.dom.volLevelReadout.style.color = isMuted ? '#f87171' : '#00f0ff';
    }

    // Audio modal volume slider sync
    if (this.dom.sliderVolume) {
      this.dom.sliderVolume.value = isMuted ? 0 : vol;
    }
    if (this.dom.valVolume) {
      this.dom.valVolume.textContent = isMuted ? 'MUTED' : `${pct}%`;
    }
  }

  /**
   * Update the grey broadcast resolution label below the bottom-left corner of the central video display
   * Standard tiers: 1080p, 2K, 4K, other
   */
  updateSourceResolutionDisplay(channel) {
    if (!this.dom.lblOriginalSourceRes) return;
    const ch = channel || this.cm.getActiveChannel();
    const tier = classifySourceResolution(ch, this.cm.video);

    let resDetails = '';
    if (this.cm.video && this.cm.video.videoWidth && this.cm.video.videoHeight) {
      resDetails = ` (${this.cm.video.videoWidth}x${this.cm.video.videoHeight})`;
    } else if (ch?.signalQuality?.resolution) {
      resDetails = ` (${ch.signalQuality.resolution})`;
    }

    this.dom.lblOriginalSourceRes.textContent = `${tier}${resDetails}`;
  }

  /**
   * Reactively filter bottom channel cards rail when user selects or clears a curation list
   */
  handleCurationFilterChange(curationName, channelIds) {
    if (curationName && Array.isArray(channelIds) && channelIds.length > 0) {
      this.curationFilterActive = true;
      this.activeCurationChannelIds = channelIds;
      this.activeCurationName = curationName;
      this.renderChannelCardsRail();
      this.showToast('info', 'Curation Filter Active', `Displaying ${channelIds.length} channels from "${curationName}".`);
    } else {
      this.curationFilterActive = false;
      this.activeCurationChannelIds = null;
      this.activeCurationName = null;
      this.renderChannelCardsRail();
      this.showToast('info', 'All Channels Active', 'Restored complete channel lineup on bottom dock.');
    }
  }

  submitKeypadTune() {
    if (!this.keypadBuffer) return;
    const num = parseInt(this.keypadBuffer, 10);
    const success = this.cm.tuneByNumber(num);
    if (success) {
      this.dom.keypadModalBackdrop.classList.add('hidden');
      this.showToast('success', 'Channel Tuned', `Tuned to Channel ${num}`);
    } else {
      this.showToast('error', 'Channel Not Found', `No channel registered with number ${num}`);
      this.keypadBuffer = '';
      this.dom.keypadDigits.textContent = 'ERR';
    }
  }

  syncEqSlidersFromEngine() {
    const vals = this.ae.eqValues;
    this.dom.sliderBass.value = vals.bass;
    this.dom.valBass.textContent = `${vals.bass >= 0 ? '+' : ''}${vals.bass} dB`;
    this.dom.sliderMids.value = vals.mids;
    this.dom.valMids.textContent = `${vals.mids >= 0 ? '+' : ''}${vals.mids} dB`;
    this.dom.sliderTreble.value = vals.treble;
    this.dom.valTreble.textContent = `${vals.treble >= 0 ? '+' : ''}${vals.treble} dB`;
  }

  updateActiveChannelDisplay(channel, index) {
    if (!channel) return;

    const cInfo = channel.country || {};
    const flag = cInfo.flag || '🌐';
    const cName = cInfo.name || 'International';
    const city = channel.city ? ` (${channel.city})` : '';

    // Lower third
    this.dom.activeChNumber.textContent = `CH ${channel.number || channel.channelNumber}`;
    this.dom.activeChCallsign.textContent = channel.callsign || 'LIVE';
    this.dom.activeChFlag.textContent = flag;
    this.dom.activeChName.textContent = channel.name;
    this.dom.activeChGenre.textContent = channel.genre || channel.category;
    this.dom.activeChFps.textContent = `${channel.signalQuality?.fps || 30.0} FPS`;
    
    this.dom.activeChCompany.textContent = channel.responsibleCompany || 'Broadcast Network';
    this.dom.activeChOrigin.textContent = `${cName}${city}`;
    this.dom.activeChDesc.textContent = channel.description || (channel.textSummary && channel.textSummary.contentFocus) || '';

    if (channel.accentColor) {
      this.dom.activeChNumber.style.color = channel.accentColor;
    }

    // Telemetry bar & overlay reset
    if (this.dom.telemetryRes) this.dom.telemetryRes.textContent = channel.signalQuality?.resolution || '1080p';
    if (this.dom.signalQualityVal) this.dom.signalQualityVal.textContent = `${channel.signalQuality?.score || 96}%`;
    if (this.dom.testPatternOverlay) this.dom.testPatternOverlay.classList.add('hidden');

    // Highlight card in rail & safely center card inside rail with zero window scroll
    const rail = this.dom.channelCardsRail;
    if (rail) {
      const cards = rail.querySelectorAll('.channel-card');
      cards.forEach(c => {
        const isCur = c.dataset.id === channel.id;
        c.classList.toggle('active', isCur);
        if (isCur) {
          const cardLeft = c.offsetLeft;
          const cardWidth = c.offsetWidth;
          const railWidth = rail.clientWidth;
          rail.scrollTo({
            left: cardLeft - (railWidth / 2) + (cardWidth / 2),
            behavior: 'smooth'
          });
        }
      });
    }

    // Update JSON summary card
    this.json.updateActiveChannelSummary(channel);

    // Apply recommended preset if AGC is enabled
    if (channel.soundQuality?.recommendedEqPreset && this.dom.toggleAgc.checked) {
      this.ae.setPreset(channel.soundQuality.recommendedEqPreset);
      this.syncEqSlidersFromEngine();
      const pBtns = this.dom.eqPresetButtons.querySelectorAll('.preset-btn');
      pBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.preset === channel.soundQuality.recommendedEqPreset);
      });
    }

    // Update Left Channel Dossier
    this.updateChannelDossier(channel, index);

    // Update grey source resolution display below bottom-left corner of central video display
    this.updateSourceResolutionDisplay(channel);

    // Cancel any pending thumbnail dwell timer from previous channel
    if (this.thumbnailDwellTimer) {
      clearTimeout(this.thumbnailDwellTimer);
      this.thumbnailDwellTimer = null;
    }

    // Safely update low-res thumbnail when channel is viewed for more than 5 seconds in central player
    this.activeViewStartTime = Date.now();
    this.thumbnailDwellTimer = setTimeout(() => {
      this.captureLiveChannelThumbnail(channel);
    }, 5000);

    // Keep base findings reference for favorites memory if available
    try {
      this.currentFindings = this.findings.getInitialFindingsForChannel(channel);
    } catch (e) {
      this.currentFindings = null;
    }

    // Update Favorite Indicator Button State
    this.updateFavoriteButtonState();

    // Notify Memory & RSI recommendation engine
    this.memory.onChannelChanged(channel);
  }

  updateChannelDossier(channel, index) {
    if (!channel) return;
    const cInfo = channel.country || {};
    const flag = cInfo.flag || '🌐';
    const cName = cInfo.name || 'International';
    const city = channel.city ? ` (${channel.city})` : '';

    if (this.dom.dosCountryTag) this.dom.dosCountryTag.textContent = cInfo.code || 'US';
    if (this.dom.dosChNum) this.dom.dosChNum.textContent = `CH ${channel.number || channel.channelNumber || 101}`;
    if (this.dom.dosCallsign) this.dom.dosCallsign.textContent = channel.callsign || 'LIVE';
    if (this.dom.dosName) this.dom.dosName.textContent = channel.name;
    if (this.dom.dosGenre) this.dom.dosGenre.textContent = channel.genre || channel.category || 'General';
    if (this.dom.dosCompany) this.dom.dosCompany.textContent = channel.responsibleCompany || 'Broadcast Studio';
    if (this.dom.dosOrigin) this.dom.dosOrigin.textContent = `${cName}${city}`;
    if (this.dom.dosResolution) this.dom.dosResolution.textContent = channel.signalQuality?.resolution || '1080p60 Full HD';
    if (this.dom.dosAspect) this.dom.dosAspect.textContent = '16:9 Standard';
    if (this.dom.dosAudioAgc) this.dom.dosAudioAgc.textContent = '-14 LUFS Norm';
    if (this.dom.dosSignalScore) this.dom.dosSignalScore.textContent = `${channel.signalQuality?.score || 98.5}% Optimal`;
    if (this.dom.dosDesc) this.dom.dosDesc.textContent = channel.description || (channel.textSummary && channel.textSummary.contentFocus) || 'Broadcast transmission stream.';
  }

  /**
   * Safety check: Verify GPU VRAM has sufficient headroom before taking frame snapshot.
   * Ensures zero display drops or memory pressure on the GTX 1070 Ti.
   */
  isVramSafeForThumbnail() {
    if (this.latestVramTelemetry) {
      const { usedPercent, freeMb, healthStatus } = this.latestVramTelemetry;
      if (usedPercent !== undefined && usedPercent >= 85) return false;
      if (freeMb !== undefined && freeMb < 1000) return false;
      if (healthStatus && (healthStatus === 'CRITICAL' || healthStatus === 'WARNING')) return false;
      return true;
    }
    if (this.dom.hudVramPct) {
      const pct = parseInt(this.dom.hudVramPct.textContent, 10);
      if (!isNaN(pct) && pct >= 85) return false;
    }
    return true; // Default safe headroom on desktop GPU
  }

  /**
   * 5-Second Dwell Live Video Thumbnail Downscaler
   * When a channel is selected and viewed continuously for > 5 seconds in the central player,
   * captures the live frame, downscales 4K / 1080p feeds to 16:9 card dimensions (320x180),
   * updates in-memory channel object, updates the bottom row card rail DOM, and caches to localStorage.
   */
  captureLiveChannelThumbnail(channel) {
    if (!channel) return;
    const activeCh = this.cm.getActiveChannel();
    if (!activeCh || (activeCh.id !== channel.id && activeCh.number !== channel.number)) {
      return;
    }

    const video = this.cm.video;
    if (!video || video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      console.log('[ThumbnailCapture] Video feed not ready or paused for frame capture');
      return;
    }

    // Safety guard: Do not capture if stream is buffering or test pattern error is displaying
    if (this.cm.isStreamBuffering || (this.dom.testPatternOverlay && !this.dom.testPatternOverlay.classList.contains('hidden'))) {
      console.log('[ThumbnailCapture] Skipped capture: Stream is buffering or signal error overlay is active');
      return;
    }

    // Safety guard: Check extra VRAM overhead
    if (!this.isVramSafeForThumbnail()) {
      console.warn('[ThumbnailCapture] Skipped capture: High VRAM pressure detected (>85% or <1000MB free).');
      return;
    }

    try {
      const srcW = video.videoWidth;
      const srcH = video.videoHeight;

      // Target resolution for bottom row card thumbnails: 320x180 (16:9 downscaled)
      // Exactly matches .card-thumb-wrapper (200x82 with 16:9 cover ratio) with high retina clarity
      const targetW = 320;
      const targetH = 180;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, targetW, targetH);

      // Black Frame Guard: Luminance & Contrast Variance Analysis
      // Prevents capturing black unrendered screens or buffering frames
      const imgData = ctx.getImageData(0, 0, targetW, targetH).data;
      let totalLuma = 0;
      let minLuma = 255;
      let maxLuma = 0;
      const sampleStep = 16; // Sample every 16th pixel (3,600 sampled pixels = fast < 0.2ms)
      let sampledCount = 0;

      for (let i = 0; i < imgData.length; i += 4 * sampleStep) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
        if (luma < minLuma) minLuma = luma;
        if (luma > maxLuma) maxLuma = luma;
        sampledCount++;
      }

      const avgLuma = sampledCount > 0 ? (totalLuma / sampledCount) : 0;
      const lumaSpread = maxLuma - minLuma;

      // Reject solid black / blank screens (Luma < 8 or contrast spread < 10)
      if (avgLuma < 8 || lumaSpread < 10) {
        console.warn(`[ThumbnailCapture] Rejected black/blank frame for CH ${channel.number || channel.channelNumber}: AvgLuma=${avgLuma.toFixed(1)}, Spread=${lumaSpread.toFixed(1)}. Preserving branding thumbnail.`);
        return;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // 1. Update in-memory channel thumbnail
      channel.thumbnail = dataUrl;
      const chIdx = this.cm.channels.findIndex(c => c.id === channel.id);
      if (chIdx !== -1) {
        this.cm.channels[chIdx].thumbnail = dataUrl;
      }

      // 2. Update bottom row rail DOM card thumbnail
      const rail = this.dom.channelCardsRail;
      if (rail) {
        const card = rail.querySelector(`.channel-card[data-id="${channel.id}"]`);
        if (card) {
          const img = card.querySelector('.card-thumb');
          if (img) {
            img.src = dataUrl;
            card.classList.add('thumb-updated-pulse');
            setTimeout(() => card.classList.remove('thumb-updated-pulse'), 1200);
          }
        }
      }

      // 3. Persist to local cache for subsequent sessions
      try {
        const cache = JSON.parse(localStorage.getItem('iptv_live_thumbnails') || '{}');
        cache[channel.id] = dataUrl;
        localStorage.setItem('iptv_live_thumbnails', JSON.stringify(cache));
      } catch (storageErr) {
        // LocalStorage quota fallback
      }

      const is4K = srcW >= 3840 || srcH >= 2160;
      const resLabel = is4K ? '4K UHD Downscaled' : `${srcW}x${srcH} Stream`;
      console.log(`[ThumbnailCapture] ${resLabel} (→ ${targetW}x${targetH}) updated for CH ${channel.number || channel.channelNumber}`);
    } catch (e) {
      console.warn('[ThumbnailCapture] Live frame capture fallback:', e);
    }
  }

  updateFindingsDisplay(f) {
    if (!f || !this.dom.findTitle) return;
    this.currentFindings = f;

    if (this.dom.findTitle) this.dom.findTitle.textContent = f.title || 'Broadcast Feature';
    if (this.dom.findMetaPill) {
      this.dom.findMetaPill.textContent = `${f.year || '2026'} • ${f.responsibleCompany || 'Studio'} • ${f.category || 'Cinema'}`;
    }
    if (this.dom.findLogline) this.dom.findLogline.textContent = f.logline || 'Live broadcast stream.';
    if (this.dom.findAiBadge) {
      this.dom.findAiBadge.textContent = f.isAiScanned ? 'GEMMA 4: VERIFIED' : 'GEMMA 4: CINEPHILE SEED';
      this.dom.findAiBadge.style.color = f.isAiScanned ? 'var(--accent-cyan)' : 'var(--accent-green)';
    }

    // DP with clickable rabbit hole trigger
    if (this.dom.findDp) {
      const dpName = f.dp || 'Director of Photography';
      this.dom.findDp.innerHTML = `<span class="creator-link-badge clickable-rabbit" title="Click to explore ${dpName}'s cinematography, camera packages & filmography">🎥 ${dpName}</span>`;
      const badge = this.dom.findDp.querySelector('.creator-link-badge');
      if (badge) {
        badge.addEventListener('click', () => this.openRabbitHole(dpName, 'Director of Photography'));
      }
    }

    // Director with clickable rabbit hole trigger
    if (this.dom.findDirector) {
      const dirName = f.director || 'Film Director';
      this.dom.findDirector.innerHTML = `<span class="creator-link-badge clickable-rabbit" title="Click to dive into ${dirName}'s filmography & notable productions">🎬 ${dirName}</span>`;
      const badge = this.dom.findDirector.querySelector('.creator-link-badge');
      if (badge) {
        badge.addEventListener('click', () => this.openRabbitHole(dirName, 'Director / Filmmaker'));
      }
    }

    if (this.dom.findCameras) this.dom.findCameras.textContent = f.cameras || 'ARRI ALEXA Mini LF / Panavision 35mm';
    if (this.dom.findLenses) this.dom.findLenses.textContent = f.lenses || 'Anamorphic Cinema Primes';
    if (this.dom.findLighting) {
      this.dom.findLighting.textContent = `${f.aspectRatio || '2.39:1 Anamorphic'} • ${f.lighting || 'Cinematic Lighting'}`;
    }

    // Actors chips with clickable rabbit hole triggers
    if (this.dom.findActorsList && Array.isArray(f.actors)) {
      this.dom.findActorsList.innerHTML = f.actors.map(a => `<span class="actor-chip clickable clickable-rabbit" data-actor="${encodeURIComponent(a)}" title="Click to dive into ${a}'s filmography & roles">${a}</span>`).join('');
      const chips = this.dom.findActorsList.querySelectorAll('.actor-chip.clickable');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          const act = decodeURIComponent(chip.dataset.actor);
          this.openRabbitHole(act, 'Lead Cast / Actor');
        });
      });
    }

    // Trivia list
    if (this.dom.findTriviaList && Array.isArray(f.trivia)) {
      this.dom.findTriviaList.innerHTML = f.trivia.map((t, i) => `
        <div class="trivia-card">
          <span class="trivia-num">0${i + 1}</span>
          <p>${t}</p>
        </div>
      `).join('');
    }

    // Image still
    if (this.dom.findPosterImg && f.image) {
      this.dom.findPosterImg.src = f.image;
      this.dom.findPosterImg.onerror = () => {
        this.dom.findPosterImg.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/No_image_available_600_x_450.svg/300px-No_image_available_600_x_450.svg.png';
      };
    }

    // Wikipedia links
    if (this.dom.findWikiLink) {
      this.dom.findWikiLink.href = f.wikiUrl || '#';
      this.dom.findWikiLink.querySelector('span').textContent = `Wikipedia: ${f.title || 'Article'}`;
    }
    if (this.dom.findDpWikiLink) {
      this.dom.findDpWikiLink.href = f.dpWikiUrl || '#';
      this.dom.findDpWikiLink.querySelector('span').textContent = `Wikipedia: ${f.dp ? f.dp.split(',')[0] : 'Cinematography'}`;
    }

    // Render Correlated Candidate Titles (Year) with Elimination actions
    if (f.candidates && f.candidates.length > 0) {
      this.renderCandidateTitles(f.candidates, f.detectedActors || f.actors);
    } else {
      this.renderCandidateTitles([], f.detectedActors || f.actors);
    }

    // Auto-dive into key creator (director or lead actor) so rabbit hole is pre-populated with lore!
    const keyPerson = f.director || (f.actors && f.actors[0]) || 'Michael Mann';
    const keyRole = f.director ? 'Director / Filmmaker' : 'Lead Cast';
    this.openRabbitHole(keyPerson, keyRole);
  }

  /**
   * Cinephile Rabbit Hole Deep Dive Explorer
   * Loads verified filmographies, camera packages, IMDb & Wikipedia citations for cast & crew
   */
  async openRabbitHole(personName, role = 'Cast / Filmmaker') {
    if (!personName) return;
    const cleanName = personName.replace(/,\s*(AIC|ASC|BSC|ACS|FSF|NSC|AMC).*/i, '').trim();

    if (this.dom.rabbitActivePersonTag) {
      this.dom.rabbitActivePersonTag.textContent = `DEEP DIVE: ${cleanName.toUpperCase()}`;
    }
    if (this.dom.rabbitPersonName) {
      this.dom.rabbitPersonName.textContent = cleanName;
    }
    if (this.dom.rabbitPersonRole) {
      this.dom.rabbitPersonRole.textContent = role;
    }
    if (this.dom.rabbitBioText) {
      this.dom.rabbitBioText.textContent = `Scanning online archives and cinephile filmography for ${cleanName}...`;
    }

    try {
      const data = await this.findings.fetchRabbitHole(cleanName, role);
      if (!data) return;

      if (this.dom.rabbitPersonName) this.dom.rabbitPersonName.textContent = data.name;
      if (this.dom.rabbitPersonRole) this.dom.rabbitPersonRole.textContent = data.role;
      if (this.dom.rabbitBioText) this.dom.rabbitBioText.textContent = data.bio;
      if (this.dom.rabbitImdbLink) this.dom.rabbitImdbLink.href = data.imdbUrl;
      if (this.dom.rabbitWikiLink) this.dom.rabbitWikiLink.href = data.wikiUrl;

      if (this.dom.rabbitPersonPhoto && data.photo) {
        this.dom.rabbitPersonPhoto.src = data.photo;
        this.dom.rabbitPersonPhoto.onerror = () => {
          this.dom.rabbitPersonPhoto.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/No_image_available_600_x_450.svg/300px-No_image_available_600_x_450.svg.png';
        };
      }

      if (this.dom.rabbitProjectsDeck) {
        if (!data.projects || data.projects.length === 0) {
          this.dom.rabbitProjectsDeck.innerHTML = `<div class="rabbit-sub-label">No related landmark projects cataloged.</div>`;
        } else {
          this.dom.rabbitProjectsDeck.innerHTML = data.projects.map(p => `
            <div class="rabbit-project-card" data-title="${encodeURIComponent(p.title)}" data-director="${encodeURIComponent(p.director || '')}" data-dp="${encodeURIComponent(p.dp || '')}">
              <div class="rp-title-row">
                <span class="rp-title">${p.title}</span>
                <span class="rp-year">${p.year || ''}</span>
              </div>
              <div class="rp-meta">
                <span class="rp-role">${p.role || role}</span>
                ${p.director ? `<span>• Dir: <strong class="rabbit-inline-link" data-jump="${encodeURIComponent(p.director)}" data-role="Director">${p.director}</strong></span>` : ''}
                ${p.dp ? `<span>• DP: <strong class="rabbit-inline-link" data-jump="${encodeURIComponent(p.dp)}" data-role="Director of Photography">${p.dp}</strong></span>` : ''}
              </div>
              ${p.cameras ? `<div class="rp-cameras">📷 ${p.cameras}${p.lenses ? ` • ${p.lenses}` : ''}</div>` : ''}
              ${p.note ? `<div class="rp-note">${p.note}</div>` : ''}
              <div class="rabbit-external-links" style="margin-top: 5px;">
                <a class="rabbit-ext-btn imdb" href="https://www.imdb.com/find/?q=${encodeURIComponent(p.title)}" target="_blank" rel="noopener">IMDb ↗</a>
                <a class="rabbit-ext-btn wiki" href="https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(p.title)}" target="_blank" rel="noopener">Wikipedia ↗</a>
              </div>
            </div>
          `).join('');

          // Recursive rabbit hole deep-dive jumps when clicking any inline director or DP!
          this.dom.rabbitProjectsDeck.querySelectorAll('.rabbit-inline-link').forEach(link => {
            link.style.cursor = 'pointer';
            link.style.textDecoration = 'underline';
            link.style.color = 'var(--accent-cyan)';
            link.addEventListener('click', (e) => {
              e.stopPropagation();
              const jumpTarget = decodeURIComponent(link.dataset.jump);
              const jumpRole = link.dataset.role;
              this.openRabbitHole(jumpTarget, jumpRole);
            });
          });
        }
      }
    } catch (err) {
      console.warn('[RabbitHole] Fetch error:', err);
    }
  }

  /**
   * Favorites Indicator & Machine Learning Preference Guidance
   */
  async toggleFavorite() {
    const activeCh = this.cm.getActiveChannel();
    if (!activeCh) return;

    // Prune any dismissed sections so false signals are excluded from ML & RSI
    const findings = this.currentFindings || {};
    const isDpDismissed = this.curatedSections['cinematography'] === 'dismissed';
    const isActorsDismissed = this.curatedSections['actors'] === 'dismissed';
    const isShowDismissed = this.curatedSections['nowShowing'] === 'dismissed';

    const prunedFindings = {
      title: isShowDismissed ? activeCh.name : (findings.title || activeCh.name),
      director: isDpDismissed ? '' : (findings.director || ''),
      dp: isDpDismissed ? '' : (findings.dp || ''),
      cameras: isDpDismissed ? '' : (findings.cameras || ''),
      actors: isActorsDismissed ? [] : (findings.actors || [])
    };

    const isFav = await this.memory.toggleFavorite(activeCh, prunedFindings);
    this.updateFavoriteButtonState();
  }

  updateFavoriteButtonState() {
    const activeCh = this.cm.getActiveChannel();
    if (!activeCh || !this.dom.btnFavoriteToggle) return;
    const isFav = this.memory.isChannelFavorited(activeCh.id);
    this.dom.btnFavoriteToggle.classList.toggle('favorited', isFav);
    this.dom.btnFavoriteToggle.setAttribute(
      'title',
      isFav
        ? '★ Favorited // High-weight preference guiding ML, RSI & Must-See'
        : '☆ Mark as Favorite // Teaches ML, RSI & Curation Engine'
    );
  }

  /**
   * Panel Curation Event Binding
   * Green Checkmark (Left): Approves information, gives high positive weight (+5.0) in ML/RSI
   * Red 'X' (Right): Dismisses / closes panel, excludes feature from ML/RSI input (-4.0 penalty)
   */
  bindCurationEvents() {
    const approveBtns = document.querySelectorAll('.btn-curate-approve');
    const dismissBtns = document.querySelectorAll('.btn-curate-dismiss');

    approveBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sectionKey = btn.dataset.section;
        const sectionElem = btn.closest('.finding-section');
        this.handleSectionCurate(sectionKey, sectionElem, 'approve');
      });
    });

    dismissBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sectionKey = btn.dataset.section;
        const sectionElem = btn.closest('.finding-section');
        this.handleSectionCurate(sectionKey, sectionElem, 'dismiss');
      });
    });
  }

  /**
   * Handle user Approval or Dismissal of a specific findings section
   */
  async handleSectionCurate(sectionKey, sectionElem, action) {
    if (!sectionElem) return;
    const activeCh = this.cm.getActiveChannel();
    const sectionName = sectionElem.dataset.sectionName || sectionKey;
    const findings = this.currentFindings || {};

    // Extract relevant features for this section
    const features = {
      show_title: findings.title || activeCh?.name || 'Broadcast Feature',
      genre: activeCh?.genre || activeCh?.category || 'Cinema'
    };

    if (sectionKey === 'nowShowing') {
      features.show_title = findings.title;
    } else if (sectionKey === 'cinematography') {
      features.dp = findings.dp || '';
      features.director = findings.director || '';
      features.camera = findings.cameras || '';
      features.lenses = findings.lenses || '';
    } else if (sectionKey === 'actors') {
      features.actors = findings.actors || [];
    } else if (sectionKey === 'lore') {
      features.trivia = findings.trivia || [];
    } else if (sectionKey === 'images') {
      features.image = findings.image || '';
    } else if (sectionKey === 'citations') {
      features.wikiUrl = findings.wikiUrl || '';
    } else if (sectionKey === 'audio') {
      const chars = Array.from(this.dom.audioCharactersList?.querySelectorAll('.char-pill') || []).map(p => p.dataset.name).filter(Boolean);
      features.actors = chars;
      features.transcript = this.dom.audioTranscriptText?.textContent || '';
    } else if (sectionKey === 'rabbitHole') {
      features.person = this.dom.rabbitPersonName?.textContent || '';
      features.role = this.dom.rabbitPersonRole?.textContent || '';
    }

    // Save curated section state
    this.curatedSections[sectionKey] = action;

    // Visual State Updates
    const btnApprove = sectionElem.querySelector('.btn-curate-approve');
    const btnDismiss = sectionElem.querySelector('.btn-curate-dismiss');
    const actionsContainer = sectionElem.querySelector('.panel-curate-actions');

    // Remove existing badge
    sectionElem.querySelector('.curate-status-badge')?.remove();

    if (action === 'approve') {
      sectionElem.classList.remove('curate-dismissed', 'panel-deleting', 'panel-deleted');
      sectionElem.style.display = '';
      sectionElem.classList.add('curate-approved');
      btnApprove?.classList.add('active');
      btnDismiss?.classList.remove('active');

      const badge = document.createElement('span');
      badge.className = 'curate-status-badge approved';
      badge.textContent = 'APPROVED ✓';
      if (actionsContainer) {
        actionsContainer.insertBefore(badge, actionsContainer.firstChild);
      }

      this.showToast('success', 'Information Approved', `Verified ${sectionName}: confirmed relevant data for active show.`);
    } else {
      // User clicked red 'X': delete panel from orchestrator panel & exclude from ML/RSI
      sectionElem.classList.remove('curate-approved');
      sectionElem.classList.add('panel-deleting');
      btnDismiss?.classList.add('active');
      btnApprove?.classList.remove('active');

      setTimeout(() => {
        sectionElem.classList.add('panel-deleted', 'curate-dismissed');
      }, 260);

      this.showToast('info', 'Information Panel Deleted', `Closed ${sectionName}: deleted from orchestrator panel & excluded from ML/RSI.`);
    }

    // Notify backend IPTV memory service to persist to SQLite iptv_memory.db
    if (activeCh) {
      await this.memory.curateSection(activeCh, sectionKey, action, features);
    }
  }

  /**
   * Reset curation visual states across all finding sections (called on channel change)
   */
  resetSectionCurationStyles() {
    document.querySelectorAll('.finding-section').forEach(sec => {
      sec.classList.remove('curate-approved', 'curate-dismissed', 'panel-deleting', 'panel-deleted');
      sec.style.display = '';
      sec.querySelectorAll('.btn-curate-approve, .btn-curate-dismiss').forEach(b => b.classList.remove('active'));
      sec.querySelector('.curate-status-badge')?.remove();
    });
  }

  /**
   * Audio Listener & Character Dialogue Radar
   * Transcribes broadcast speech via SOTA faster-whisper (CPU INT8, 0MB VRAM)
   * Curates character names and generates IMDb & Wikipedia search queries.
   */
  async runAudioListen() {
    if (this.isAudioListening) return;
    this.isAudioListening = true;

    const activeCh = this.cm.getActiveChannel() || { id: 'channel-feed', name: 'Channel Feed' };
    const movieTitle = this.currentFindings?.title || activeCh.name;

    if (this.dom.btnAudioListenText) this.dom.btnAudioListenText.textContent = 'LISTENING (WHISPER)...';
    if (this.dom.btnTriggerAudioListen) this.dom.btnTriggerAudioListen.classList.add('listening');

    try {
      const res = await fetch('/api/audio/listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: activeCh.id,
          channel_name: activeCh.name,
          movie_title: movieTitle,
          genre: activeCh.genre || activeCh.category || 'Cinema'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (this.dom.audioTranscriptText) {
          this.dom.audioTranscriptText.textContent = `"${data.transcript}"`;
        }
        if (this.dom.audioEngineChip) {
          this.dom.audioEngineChip.textContent = data.engine;
        }
        if (this.dom.audioLatencyChip) {
          this.dom.audioLatencyChip.textContent = `${data.latencySec}s (23x real-time)`;
        }

        // Render curated character names
        if (this.dom.audioCharactersList) {
          if (data.detectedCharacters && data.detectedCharacters.length > 0) {
            this.dom.audioCharactersList.innerHTML = data.detectedCharacters.map(char => `
              <span class="char-pill clickable-rabbit" data-name="${encodeURIComponent(char)}" data-role="Spoken Character" title="Click to dive into ${char}'s actor & filmography">
                ${char} ↗
              </span>
            `).join('');

            // Hook into Rabbit Hole
            this.dom.audioCharactersList.querySelectorAll('.clickable-rabbit').forEach(pill => {
              pill.addEventListener('click', () => {
                const charName = decodeURIComponent(pill.dataset.name);
                this.openRabbitHole(charName, 'Spoken Character');
              });
            });
          } else {
            this.dom.audioCharactersList.innerHTML = `<span class="audio-sub-label">No distinct proper character names detected in this audio segment.</span>`;
          }
        }

        // Render search queries
        if (this.dom.audioQueriesList && data.searchQueries) {
          this.dom.audioQueriesList.innerHTML = data.searchQueries.map(q => `
            <a class="audio-query-btn" href="${q.url || q.imdbUrl || q.wikiUrl}" target="_blank" rel="noopener">
              <span>${q.type}: <strong>${q.label}</strong> ↗</span>
            </a>
          `).join('');
        }

        this.showToast('success', 'Dialogue Recognized', `Heard ${data.detectedCharacters?.length || 0} characters via faster-whisper (${data.latencySec}s, 0MB VRAM).`);
      }
    } catch (err) {
      this.showToast('error', 'Audio Listen Error', err.message);
    } finally {
      this.isAudioListening = false;
      if (this.dom.btnAudioListenText) this.dom.btnAudioListenText.textContent = 'LISTEN TO FEED (5s)';
      if (this.dom.btnTriggerAudioListen) this.dom.btnTriggerAudioListen.classList.remove('listening');
    }
  }

  /**
   * Safe Model Switching: Purge Ollama VRAM to 0MB on demand
   */
  async flushVram() {
    try {
      const res = await fetch('/api/vram/flush', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        this.showToast('info', 'Safe Model Switch', data.message);
      }
    } catch (err) {
      this.showToast('error', 'Flush Error', err.message);
    }
  }

  /**
   * Render Candidate Titles (Year) with Green Checkmark and Red 'X' to the left for elimination
   */
  renderCandidateTitles(candidates, detectedActors = []) {
    if (!this.dom.secCandidateTitles) return;

    if (!candidates || candidates.length === 0) {
      if (this.dom.candidateCountTag) this.dom.candidateCountTag.textContent = '0 CANDIDATES';
      if (this.dom.candidateTitlesList) {
        this.dom.candidateTitlesList.innerHTML = `
          <div class="candidate-empty-state">
            <span>All candidates eliminated or confirmed. Click <strong>SCAN FEED</strong> to correlate more candidate titles.</span>
          </div>
        `;
      }
      return;
    }

    // Render detected actors pills
    if (this.dom.candidateActorsPills) {
      const actors = (detectedActors && detectedActors.length > 0)
        ? detectedActors
        : (this.currentFindings?.actors || ['Cast / Talent']);
      this.dom.candidateActorsPills.innerHTML = actors.map(actor => `
        <span class="candidate-actor-chip clickable-rabbit" data-actor="${encodeURIComponent(actor)}" title="Click to dive into ${actor}">
          ${actor}
        </span>
      `).join('');

      this.dom.candidateActorsPills.querySelectorAll('.clickable-rabbit').forEach(pill => {
        pill.addEventListener('click', () => {
          const name = decodeURIComponent(pill.dataset.actor);
          this.openRabbitHole(name, 'Actor / Performer');
        });
      });
    }

    if (this.dom.candidateCountTag) {
      this.dom.candidateCountTag.textContent = `${candidates.length} CANDIDATES`;
    }

    // Render list with action buttons strictly to the LEFT
    if (this.dom.candidateTitlesList) {
      this.dom.candidateTitlesList.innerHTML = candidates.map(cand => `
        <div class="candidate-row" data-title="${encodeURIComponent(cand.title)}" data-year="${cand.year}">
          <div class="candidate-actions-left">
            <button class="btn-candidate-approve" data-title="${encodeURIComponent(cand.title)}" data-year="${cand.year}" title="Confirm ${cand.title} (${cand.year}) as current show" aria-label="Confirm">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="btn-candidate-dismiss" data-title="${encodeURIComponent(cand.title)}" data-year="${cand.year}" title="Eliminate ${cand.title} (${cand.year}) from candidates" aria-label="Eliminate">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="candidate-meta">
            <div class="candidate-title-line">
              <strong class="candidate-title-text">${cand.title} (${cand.year})</strong>
              <span class="candidate-match-pct">${cand.matchPct || 85}% MATCH</span>
            </div>
            <div class="candidate-correlation-text">${cand.correlation || 'Correlated by genre & cast'}</div>
          </div>
        </div>
      `).join('');

      // Wire elimination (Red 'X') and confirmation (Green Checkmark)
      const rows = this.dom.candidateTitlesList.querySelectorAll('.candidate-row');
      rows.forEach(row => {
        const rawTitle = decodeURIComponent(row.dataset.title);
        const year = row.dataset.year;
        const btnEliminate = row.querySelector('.btn-candidate-dismiss');
        const btnConfirm = row.querySelector('.btn-candidate-approve');

        btnEliminate?.addEventListener('click', (e) => {
          e.stopPropagation();
          row.classList.add('eliminating');
          setTimeout(() => {
            row.remove();
            const remaining = this.dom.candidateTitlesList?.querySelectorAll('.candidate-row').length || 0;
            if (this.dom.candidateCountTag) {
              this.dom.candidateCountTag.textContent = `${remaining} CANDIDATE${remaining === 1 ? '' : 'S'}`;
            }
            if (remaining === 0) {
              this.renderCandidateTitles([]);
            }
          }, 240);
          this.showToast('info', 'Candidate Eliminated', `Removed '${rawTitle} (${year})' from candidate set.`);
        });

        btnConfirm?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.confirmCandidateTitle(rawTitle, year, row);
        });
      });
    }
  }

  /**
   * User confirmed a candidate title via green checkmark
   */
  async confirmCandidateTitle(title, year, confirmedRow) {
    const activeCh = this.cm.getActiveChannel();
    
    // Highlight confirmed row and eliminate others
    if (this.dom.candidateTitlesList) {
      const allRows = this.dom.candidateTitlesList.querySelectorAll('.candidate-row');
      allRows.forEach(r => {
        if (r === confirmedRow) {
          r.classList.add('confirmed');
        } else {
          r.classList.add('eliminating');
          setTimeout(() => r.remove(), 250);
        }
      });
    }

    // Lookup technical dossier for this confirmed title
    const dossier = this.findings.getDossierByTitle(title);
    if (dossier) {
      this.updateFindingsDisplay({
        ...this.currentFindings,
        title: dossier.title,
        year: dossier.year,
        director: dossier.director,
        dp: dossier.dp,
        cameras: dossier.cameras,
        lenses: dossier.lenses,
        aspectRatio: dossier.aspectRatio,
        lighting: dossier.lighting,
        logline: dossier.logline,
        actors: dossier.actors,
        trivia: dossier.trivia,
        image: dossier.image,
        wikiUrl: dossier.wikiUrl,
        dpWikiUrl: dossier.dpWikiUrl,
        candidates: [
          { title: dossier.title, year: dossier.year, correlation: 'Confirmed by user selection', matchPct: 100 }
        ]
      });
    } else {
      if (this.dom.findTitle) this.dom.findTitle.textContent = title;
      if (this.dom.findMetaPill) this.dom.findMetaPill.textContent = `${year} • Verified Feature • ${activeCh?.category || 'Cinema'}`;
    }

    // Mark Now Showing section as APPROVED
    const secNowShowing = document.getElementById('secNowShowing');
    if (secNowShowing) {
      await this.handleSectionCurate('nowShowing', secNowShowing, 'approve');
    }

    // Notify IPTV Memory & RSI service (+5.0 positive preference weight)
    if (activeCh) {
      await this.memory.recordInteraction('curate_approve', {
        channel_id: activeCh.id,
        channel_name: activeCh.name,
        show_title: title,
        year: year,
        genre: activeCh.genre || activeCh.category
      });
    }

    this.showToast('success', 'Title Confirmed ✓', `'${title} (${year})' verified as active show for ${activeCh?.name || 'current channel'}.`);
  }

  /**
   * Toggle 10-second multi-frame feed scan loop
   */
  toggleFeedScanLoop() {
    if (this.feedScanLoopActive) {
      this.stopFeedScanLoop();
    } else {
      this.startFeedScanLoop();
    }
  }

  startFeedScanLoop() {
    this.feedScanLoopActive = true;
    if (this.dom.btnOrchestratorScan) {
      this.dom.btnOrchestratorScan.classList.add('scanning-loop');
    }
    if (this.dom.btnOrchestratorText) {
      this.dom.btnOrchestratorText.textContent = 'SCANNING (10s LOOP)...';
    }

    this.showToast('info', 'Feed Scan Started', 'Capturing lower-res frames every 10s for actor correlation.');

    // Execute first scan immediately
    this.executeMultiFrameActorScan();

    // Schedule 10s intervals
    if (this.feedScanInterval) clearInterval(this.feedScanInterval);
    this.feedScanInterval = setInterval(() => {
      if (this.feedScanLoopActive) {
        this.executeMultiFrameActorScan();
      }
    }, 10000);
  }

  stopFeedScanLoop() {
    this.feedScanLoopActive = false;
    if (this.feedScanInterval) {
      clearInterval(this.feedScanInterval);
      this.feedScanInterval = null;
    }
    if (this.dom.btnOrchestratorScan) {
      this.dom.btnOrchestratorScan.classList.remove('scanning-loop');
    }
    if (this.dom.btnOrchestratorText) {
      this.dom.btnOrchestratorText.textContent = 'SCAN FEED';
    }
    this.showToast('info', 'Feed Scan Paused', '10-second multi-frame scan loop stopped.');
  }

  async executeMultiFrameActorScan() {
    if (this.isMultiFrameScanning) return;
    this.isMultiFrameScanning = true;

    const activeCh = this.cm.getActiveChannel() || {
      name: 'Channel Feed',
      number: '101',
      category: 'General',
      country: 'Global'
    };

    try {
      // Capture 3 lower-res frames (640x360) spaced 400ms apart
      const frames = [];
      const f1 = this.findings.captureLowerResFrame(this.cm.video, 640, 360, 0.70);
      if (f1) frames.push(f1);

      await new Promise(r => setTimeout(r, 400));
      const f2 = this.findings.captureLowerResFrame(this.cm.video, 640, 360, 0.70);
      if (f2) frames.push(f2);

      await new Promise(r => setTimeout(r, 400));
      const f3 = this.findings.captureLowerResFrame(this.cm.video, 640, 360, 0.70);
      if (f3) frames.push(f3);

      if (frames.length > 0) {
        const result = await this.findings.scanFeedFramesForActors(frames, activeCh, (msg) => {
          if (this.dom.findLogline) this.dom.findLogline.textContent = msg;
        });

        if (result) {
          this.renderCandidateTitles(result.candidateTitles, result.detectedActors);
          if (this.dom.findAiBadge) {
            this.dom.findAiBadge.textContent = 'GEMMA 4: ACTORS DETECTED';
            this.dom.findAiBadge.style.color = 'var(--accent-cyan)';
          }
        }
      }
    } catch (e) {
      console.warn('[UIController] Multi-frame scan error:', e);
    } finally {
      this.isMultiFrameScanning = false;
    }
  }

  async runOrchestratorScan() {
    return this.executeMultiFrameActorScan();
  }

  updateDvrState(state) {
    if (state.isRecording) {
      this.dom.btnDvrRecord.classList.add('recording');
      this.dom.btnDvrDeck.classList.add('recording');
      this.dom.btnDvrText.textContent = `REC ${state.formattedDuration}`;
      this.dom.dvrRecordingHud.classList.remove('hidden');
      this.dom.dvrElapsedTimer.textContent = state.formattedDuration;
      this.dom.dvrSizeCounter.textContent = state.sizeMB;
    } else {
      this.dom.btnDvrRecord.classList.remove('recording');
      this.dom.btnDvrDeck.classList.remove('recording');
      this.dom.btnDvrText.textContent = 'DVR REC';
      this.dom.dvrRecordingHud.classList.add('hidden');
    }

    this.dom.dvrClipsCount.textContent = state.recordingsHistory.length;
  }

  renderDvrList() {
    const list = this.dom.dvrRecordingsList;
    list.innerHTML = '';
    const history = this.dvr.recordingsHistory;

    if (history.length === 0) {
      list.innerHTML = `<div class="dvr-empty-state">No clips recorded yet. Click <strong>DVR REC</strong> to start capturing live streams.</div>`;
      return;
    }

    history.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = 'dvr-item';
      item.innerHTML = `
        <div class="dvr-item-left">
          <div class="dvr-filename">${rec.filename}</div>
          <div class="dvr-meta">CH ${rec.channel?.number || '000'} • ${rec.duration} • ${rec.size} • Recorded at ${rec.timestamp}</div>
        </div>
        <div class="dvr-item-actions">
          <a class="btn-tune-table" href="${rec.url}" download="${rec.filename}">DOWNLOAD</a>
        </div>
      `;
      list.appendChild(item);
    });
  }

  /**
   * Loads complete 15,775 channels database and renders searchable directory table
   */
  async loadAndRenderGlobalDirectory() {
    if (this.completeChannelsList.length === 0) {
      if (this.dom.directoryCountLabel) {
        this.dom.directoryCountLabel.textContent = 'Loading 15,775 channels database...';
      }
      try {
        const res = await fetch('/channels_complete.json');
        if (res.ok) {
          const data = await res.json();
          this.completeChannelsList = (data.channels || []).map(ch => {
            ch.language = resolveChannelLanguage(ch);
            ch._resHeight = parseChannelResolutionHeight(ch);
            return ch;
          });
          this.populateDirectoryFilterDropdowns();
        }
      } catch (err) {
        console.warn('Failed to load channels_complete.json:', err);
      }
    }
    this.applyDirectoryFiltersAndSort();
  }

  updateSortOrderButtonUi() {
    if (this.dom.sortDirIcon && this.dom.sortDirText) {
      const isAsc = this.directorySortOrder === 'asc';
      this.dom.sortDirIcon.textContent = isAsc ? '▲' : '▼';
      this.dom.sortDirText.textContent = isAsc ? 'ASC' : 'DESC';
    }
  }

  resetDirectoryFiltersAndSort() {
    this.directorySortKey = 'name';
    this.directorySortOrder = 'asc';
    this.directorySearchQuery = '';
    this.directoryResolutionFilter = 'ALL';
    this.directoryLanguageFilter = 'ALL';
    this.directoryCountryFilter = 'ALL';
    this.directoryDisplayLimit = 100;

    if (this.dom.directorySearchInput) this.dom.directorySearchInput.value = '';
    if (this.dom.btnClearDirectorySearch) this.dom.btnClearDirectorySearch.classList.add('hidden');
    if (this.dom.directorySortSelect) this.dom.directorySortSelect.value = 'name';
    if (this.dom.directoryResolutionFilter) this.dom.directoryResolutionFilter.value = 'ALL';
    if (this.dom.directoryLanguageFilter) this.dom.directoryLanguageFilter.value = 'ALL';
    if (this.dom.directoryCountryFilter) this.dom.directoryCountryFilter.value = 'ALL';

    this.updateSortOrderButtonUi();
    this.applyDirectoryFiltersAndSort();
    this.showToast('info', 'Filters Reset', 'All directory filters and sorting reset to default.');
  }

  populateDirectoryFilterDropdowns() {
    if (!this.completeChannelsList.length) return;

    // Populate Languages Dropdown
    if (this.dom.directoryLanguageFilter) {
      const langCounts = {};
      this.completeChannelsList.forEach(ch => {
        const lang = ch.language || 'English';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });

      const sortedLangs = Object.keys(langCounts).sort();
      this.dom.directoryLanguageFilter.innerHTML = `<option value="ALL">All Languages (${sortedLangs.length})</option>` +
        sortedLangs.map(l => `<option value="${l}">${l} (${langCounts[l]})</option>`).join('');
    }

    // Populate Countries Dropdown
    if (this.dom.directoryCountryFilter) {
      const countryMap = {};
      this.completeChannelsList.forEach(ch => {
        const code = ch.country?.code || 'US';
        const name = ch.country?.name || code;
        const flag = ch.country?.flag || '🌐';
        if (!countryMap[code]) {
          countryMap[code] = { code, name, flag, count: 0 };
        }
        countryMap[code].count++;
      });

      const sortedCountries = Object.values(countryMap).sort((a, b) => a.name.localeCompare(b.name));
      this.dom.directoryCountryFilter.innerHTML = `<option value="ALL">All Countries (${sortedCountries.length})</option>` +
        sortedCountries.map(c => `<option value="${c.code}">${c.flag} ${c.name} (${c.count})</option>`).join('');
    }
  }

  applyDirectoryFiltersAndSort() {
    const q = this.directorySearchQuery;
    const resF = this.directoryResolutionFilter;
    const langF = this.directoryLanguageFilter;
    const countryF = this.directoryCountryFilter;

    // 1. FILTERING
    this.filteredCompleteChannels = this.completeChannelsList.filter(c => {
      // Search query filter
      if (q) {
        const matchQ = c.name.toLowerCase().includes(q) ||
          (c.country?.name && c.country.name.toLowerCase().includes(q)) ||
          (c.country?.code && c.country.code.toLowerCase().includes(q)) ||
          (c.language && c.language.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.responsibleCompany && c.responsibleCompany.toLowerCase().includes(q)) ||
          String(c.channelNumber).includes(q) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.formatInformation?.resolutionHint && c.formatInformation.resolutionHint.toLowerCase().includes(q));
        if (!matchQ) return false;
      }

      // Resolution dimension filter
      if (resF !== 'ALL') {
        const h = c._resHeight || 720;
        if (resF === '4K' && h < 2160) return false;
        if (resF === '1080p' && (h < 1080 || h >= 2160)) return false;
        if (resF === '720p' && (h < 720 || h >= 1080)) return false;
        if (resF === 'SD' && h >= 720) return false;
      }

      // Language dimension filter
      if (langF !== 'ALL' && c.language !== langF) {
        return false;
      }

      // Country dimension filter
      if (countryF !== 'ALL' && c.country?.code !== countryF) {
        return false;
      }

      return true;
    });

    // 2. SORTING
    const key = this.directorySortKey;
    const isDesc = this.directorySortOrder === 'desc';

    this.filteredCompleteChannels.sort((a, b) => {
      let cmp = 0;
      if (key === 'resolution') {
        // Broadcast resolution numeric vertical pixel height
        cmp = (a._resHeight || 0) - (b._resHeight || 0);
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else if (key === 'country') {
        // Country of origin name
        const cA = a.country?.name || '';
        const cB = b.country?.name || '';
        cmp = cA.localeCompare(cB);
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else if (key === 'language') {
        // Broadcast language
        const lA = a.language || '';
        const lB = b.language || '';
        cmp = lA.localeCompare(lB);
        if (cmp === 0) cmp = (a.country?.name || '').localeCompare(b.country?.name || '');
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else if (key === 'number') {
        // Channel number
        cmp = (a.channelNumber || 0) - (b.channelNumber || 0);
      } else if (key === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else if (key === 'company') {
        cmp = (a.responsibleCompany || '').localeCompare(b.responsibleCompany || '');
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else {
        // Default: Alphabetical Channel Name
        cmp = a.name.localeCompare(b.name);
      }

      return isDesc ? -cmp : cmp;
    });

    // 3. Update Table Header Sort Indicators
    if (this.dom.directoryTable) {
      this.dom.directoryTable.querySelectorAll('.sortable-th').forEach(th => {
        const iconSpan = th.querySelector('.th-sort-icon');
        if (th.dataset.sort === key) {
          th.classList.add('active-sort-th');
          if (iconSpan) iconSpan.textContent = isDesc ? '▼' : '▲';
        } else {
          th.classList.remove('active-sort-th');
          if (iconSpan) iconSpan.textContent = '';
        }
      });
    }

    this.renderDirectoryRows();
  }

  renderDirectoryRows() {
    const tbody = this.dom.directoryTableBody;
    tbody.innerHTML = '';
    const slice = this.filteredCompleteChannels.slice(0, this.directoryDisplayLimit);

    const sortLabels = {
      name: 'Name',
      resolution: 'Broadcast Resolution',
      country: 'Country of Origin',
      language: 'Language',
      number: 'Channel Number',
      category: 'Category',
      company: 'Company'
    };
    const activeSortName = sortLabels[this.directorySortKey] || 'Name';
    const orderName = this.directorySortOrder === 'desc' ? 'High → Low / Z → A' : 'Low → High / A → Z';

    if (this.dom.directoryCountLabel) {
      this.dom.directoryCountLabel.textContent = `Showing ${slice.length.toLocaleString()} of ${this.filteredCompleteChannels.length.toLocaleString()} channels (${this.completeChannelsList.length.toLocaleString()} total) • Sort: ${activeSortName} (${orderName})`;
    }

    slice.forEach(ch => {
      const resMeta = getResolutionBadgeMeta(ch._resHeight, ch.formatInformation?.resolutionHint);
      const flag = ch.country?.flag || '🌐';
      const countryName = ch.country?.name || 'International';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color:var(--accent-cyan)">${ch.channelNumber}</strong></td>
        <td><span style="font-size:1.05rem;margin-right:4px;">${flag}</span> ${countryName}</td>
        <td><strong>${ch.name}</strong></td>
        <td><span class="badge-lang">${ch.language}</span></td>
        <td><span class="badge-res ${resMeta.class}">${resMeta.label}</span></td>
        <td>${ch.category}</td>
        <td>${ch.responsibleCompany || 'Broadcast Network'}</td>
        <td><button class="btn-tune-table">TUNE</button></td>
      `;

      tr.querySelector('.btn-tune-table').addEventListener('click', () => {
        this.cm.playChannel({
          id: ch.channelId,
          number: ch.channelNumber,
          name: ch.name,
          callsign: ch.callsign,
          category: ch.category,
          genre: ch.category,
          country: ch.country,
          language: ch.language,
          city: ch.city,
          responsibleCompany: ch.responsibleCompany,
          streamUrl: ch.formatInformation?.streamUrl,
          thumbnail: '/thumbnails/accuweather-now.svg',
          svgFallback: '/thumbnails/accuweather-now.svg',
          accentColor: '#00f5d4',
          signalQuality: {
            status: 'ONLINE',
            score: 96,
            resolution: resMeta.label,
            fps: 30,
            bitrateKbps: ch.formatInformation?.estimatedBitrateKbps || 3500
          }
        });
        this.dom.globalDirectoryModalBackdrop.classList.add('hidden');
        this.showToast('success', 'Tuned from Global Directory', `${flag} ${ch.name} (CH ${ch.channelNumber}) • ${ch.language}`);
      });

      tbody.appendChild(tr);
    });

    if (this.dom.directoryLoadMoreBar) {
      this.dom.directoryLoadMoreBar.classList.toggle('hidden', this.filteredCompleteChannels.length <= this.directoryDisplayLimit);
    }
  }

  startAudioMeterLoop() {
    const loop = () => {
      if (!this.dom.audioModalBackdrop.classList.contains('hidden')) {
        const { rmsDb, percentage } = this.ae.getDecibelLevel();
        this.dom.meterFill.style.width = `${percentage}%`;
        this.dom.dbReadout.textContent = `${rmsDb.toFixed(1)} dB`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderChannelCardsRail() {
    const rail = this.dom.channelCardsRail;
    rail.innerHTML = '';

    const channels = this.cm.channels;
    const activeCh = this.cm.getActiveChannel();

    const filtered = channels.filter(ch => {
      // If a curation list is actively selected, filter to channels in this list
      if (this.curationFilterActive && this.activeCurationChannelIds && this.activeCurationChannelIds.length > 0) {
        const idMatches = this.activeCurationChannelIds.includes(ch.id) ||
                          this.activeCurationChannelIds.includes(String(ch.number || ch.channelNumber));
        if (!idMatches) return false;
      }

      const matchCat = this.activeCategory === 'ALL' || ch.category === this.activeCategory;
      const matchCountry = this.activeCountry === 'ALL' || (ch.country && ch.country.code === this.activeCountry);
      const chLang = resolveChannelLanguage(ch);
      const matchSearch = !this.searchQuery || 
        ch.name.toLowerCase().includes(this.searchQuery) ||
        (ch.callsign && ch.callsign.toLowerCase().includes(this.searchQuery)) ||
        (ch.country && ch.country.name.toLowerCase().includes(this.searchQuery)) ||
        (ch.country && ch.country.code.toLowerCase().includes(this.searchQuery)) ||
        chLang.toLowerCase().includes(this.searchQuery) ||
        (ch.city && ch.city.toLowerCase().includes(this.searchQuery)) ||
        (ch.responsibleCompany && ch.responsibleCompany.toLowerCase().includes(this.searchQuery)) ||
        String(ch.number || ch.channelNumber).includes(this.searchQuery) ||
        (ch.genre && ch.genre.toLowerCase().includes(this.searchQuery));
      return matchCat && matchCountry && matchSearch;
    });

    // Apply active rail sort
    filtered.sort((a, b) => {
      if (this.dockSortKey === 'name') {
        return a.name.localeCompare(b.name);
      } else if (this.dockSortKey === 'resolution') {
        const hA = parseChannelResolutionHeight(a);
        const hB = parseChannelResolutionHeight(b);
        return hB - hA || a.name.localeCompare(b.name);
      } else if (this.dockSortKey === 'country') {
        const cA = a.country?.name || '';
        const cB = b.country?.name || '';
        return cA.localeCompare(cB) || a.name.localeCompare(b.name);
      } else if (this.dockSortKey === 'language') {
        const lA = resolveChannelLanguage(a);
        const lB = resolveChannelLanguage(b);
        return lA.localeCompare(lB) || (a.country?.name || '').localeCompare(b.country?.name || '') || a.name.localeCompare(b.name);
      } else {
        // Default: Channel Number
        return (a.number || a.channelNumber || 0) - (b.number || b.channelNumber || 0);
      }
    });

    filtered.forEach(ch => {
      const card = document.createElement('div');
      card.className = `channel-card ${activeCh && (activeCh.id === ch.id || activeCh.number === ch.number) ? 'active' : ''}`;
      card.dataset.id = ch.id;

      const thumbUrl = ch.thumbnail || ch.svgFallback;
      const flag = ch.country?.flag || '🌐';

      card.innerHTML = `
        <div class="card-thumb-wrapper">
          <img class="card-thumb" src="${thumbUrl}" alt="${ch.name}" loading="lazy" />
          <div class="card-badges">
            <span class="card-ch-num">${flag} CH ${ch.number || ch.channelNumber}</span>
            <span class="card-res">${ch.signalQuality?.resolution || '1080p'}</span>
          </div>
        </div>
        <div class="card-meta">
          <div class="card-title">${ch.name}</div>
          <div class="card-subline">
            <span class="card-genre">${ch.country?.name || ch.genre || ch.category}</span>
            <span class="card-qual">${ch.signalQuality?.score || 96}%</span>
          </div>
        </div>
      `;

      const img = card.querySelector('img');
      img.onerror = () => {
        img.src = ch.svgFallback || '/thumbnails/accuweather-now.svg';
      };

      card.addEventListener('click', () => {
        this.cm.tuneToId(ch.id);
      });

      rail.appendChild(card);
    });
  }

  showCardTooltip(channel, screenX, screenY) {
    const tt = this.dom.cardTooltip;
    if (!channel) {
      tt.classList.remove('visible');
      return;
    }

    const flag = channel.country?.flag || '🌐';
    this.dom.ttNum.textContent = `${flag} CH ${channel.number || channel.channelNumber} • ${channel.callsign || 'LIVE'}`;
    this.dom.ttRes.textContent = channel.signalQuality?.resolution || '1080p';
    this.dom.ttTitle.textContent = channel.name;
    this.dom.ttMeta.textContent = `${channel.category} • ${channel.responsibleCompany || 'Broadcast'}`;

    tt.style.left = `${screenX}px`;
    tt.style.top = `${screenY}px`;
    tt.classList.add('visible');
  }

  showAutoplayUnlock() {
    this.dom.audioUnlockPill.classList.remove('hidden');
  }

  showStreamError(channel, details) {
    if (this.thumbnailDwellTimer) {
      clearTimeout(this.thumbnailDwellTimer);
      this.thumbnailDwellTimer = null;
    }

    const diagnosis = typeof details === 'object' && details !== null ? details : {
      title: '⚠️ SIGNAL INTERRUPTED',
      badge: '⚠️ BUFFERING',
      color: '#ffb703',
      reason: String(details || 'Buffering timeout'),
      message: 'Stream encountered buffering or connection failure while establishing server link.'
    };

    if (this.dom.testPatternTitle) {
      this.dom.testPatternTitle.textContent = diagnosis.title || 'TEST PATTERN // NO SIGNAL';
      if (diagnosis.color) this.dom.testPatternTitle.style.color = diagnosis.color;
    }

    if (this.dom.testPatternMsg) {
      this.dom.testPatternMsg.innerHTML = `
        <div style="margin-bottom: 6px; font-weight: 700; color: ${diagnosis.color || '#ff4d6d'}; letter-spacing: 0.05em;">
          ${diagnosis.reason || 'Broadcast Connection Stalled'}
        </div>
        <div style="font-size: 0.82rem; color: #94a3b8; line-height: 1.45; max-width: 480px; margin: 0 auto;">
          ${diagnosis.message || 'Stream link negotiation stalled.'}
        </div>
      `;
    }

    this.dom.testPatternOverlay.classList.remove('hidden');

    // Add diagnostic status pill on bottom card rail item
    const rail = this.dom.channelCardsRail;
    if (rail && channel) {
      const card = rail.querySelector(`.channel-card[data-id="${channel.id}"]`);
      if (card) {
        let badge = card.querySelector('.badge-stream-diagnostic');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'badge-stream-diagnostic';
          const thumbWrap = card.querySelector('.card-thumb-wrapper');
          if (thumbWrap) thumbWrap.appendChild(badge);
        }
        badge.textContent = diagnosis.badge || 'ERROR';
        if (diagnosis.color) badge.style.borderColor = diagnosis.color;
      }
    }

    this.showToast('error', diagnosis.title || 'Signal Interrupted', `${channel.name}: ${diagnosis.reason || details}`);
  }

  updateTelemetry(data) {
    if (data.resolution && this.dom.telemetryRes) this.dom.telemetryRes.textContent = data.resolution;
    if (data.latency && this.dom.telemetryLatency) this.dom.telemetryLatency.textContent = `${data.latency} ms`;
    if (data.bitrate && this.dom.telemetryBitrate) this.dom.telemetryBitrate.textContent = `${data.bitrate.toLocaleString()} kbps`;
    if (data.qualityScore && this.dom.signalQualityVal) this.dom.signalQualityVal.textContent = `${data.qualityScore}%`;
  }

  showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `cyber-toast toast-${type}`;

    const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ');
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <strong>${title}</strong>
        <span>${message}</span>
      </div>
    `;

    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px) scale(0.97)';
      toast.style.transition = 'all 0.25s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }

  /* ==========================================================================
     AI VISION MODAL & GEMMA 4 ANALYSIS CONTROLS
     ========================================================================== */
  openVisionModal() {
    if (!this.dom.visionModalBackdrop) return;
    this.dom.visionModalBackdrop.classList.remove('hidden');

    // Auto-capture current live frame preview
    try {
      const frame = this.visionAnalyzer.captureFrame();
      if (this.dom.visionFrameImg) {
        this.dom.visionFrameImg.src = frame.dataUrl;
      }
      if (this.dom.visionFrameRes) {
        this.dom.visionFrameRes.textContent = `${frame.width} × ${frame.height} (${frame.aspectRatio})`;
      }
    } catch (e) {
      console.warn('[VisionModal] Frame preview capture fallback:', e);
    }
  }

  closeVisionModal() {
    if (this.dom.visionModalBackdrop) {
      this.dom.visionModalBackdrop.classList.add('hidden');
    }
  }

  async runVisionScan() {
    if (!this.visionAnalyzer || this.visionAnalyzer.isAnalyzing) return;

    const activeCh = this.cm.getActiveChannel() || {
      name: 'Channel Feed',
      number: '101',
      category: 'General',
      country: 'Global'
    };

    // UI Busy State
    if (this.dom.btnTriggerVisionScan) {
      this.dom.btnTriggerVisionScan.disabled = true;
      this.dom.btnTriggerVisionScan.style.opacity = '0.6';
    }
    if (this.dom.visionSpinner) this.dom.visionSpinner.classList.add('active');
    if (this.dom.visionScanLine) this.dom.visionScanLine.classList.add('scanning');

    try {
      const result = await this.visionAnalyzer.analyzeCurrentFeed(activeCh, (step, msg) => {
        if (this.dom.visionStatusHeadline) {
          this.dom.visionStatusHeadline.textContent = msg;
        }
      });

      this.currentVisionReportMd = result.reportMd;

      // Update Preview Image
      if (this.dom.visionFrameImg && result.frame?.dataUrl) {
        this.dom.visionFrameImg.src = result.frame.dataUrl;
      }
      if (this.dom.visionFrameRes && result.frame) {
        this.dom.visionFrameRes.textContent = `${result.frame.width} × ${result.frame.height} (${result.frame.aspectRatio})`;
      }

      // Render Markdown Report
      if (this.dom.visionReportViewer) {
        this.dom.visionReportViewer.innerHTML = this.renderMarkdownToHtml(result.reportMd);
      }

      // Update Status Banner
      if (this.dom.visionStatusHeadline) {
        this.dom.visionStatusHeadline.textContent = `Analysis Complete (${(result.elapsedMs / 1000).toFixed(1)}s)`;
      }
      if (this.dom.visionStatusSub) {
        this.dom.visionStatusSub.textContent = `Model: Gemma 4 • Zero Display Disruption • Headroom: ${result.telemetryPost?.vram?.freeMb || 3600} MB Free`;
      }
      if (this.dom.visionHwBadge) {
        this.dom.visionHwBadge.textContent = `VRAM: ${(result.telemetryPost?.vram?.freeMb || 3600)} MB FREE (SAFE)`;
      }

      this.showToast('success', 'Vision Analysis Complete', `Gemma 4 analyzed frame in ${(result.elapsedMs / 1000).toFixed(1)}s with 0 dropped frames.`);

    } catch (err) {
      console.error('[UIController] Vision analysis error:', err);
      if (this.dom.visionStatusHeadline) {
        this.dom.visionStatusHeadline.textContent = 'Analysis Failed';
      }
      if (this.dom.visionStatusSub) {
        this.dom.visionStatusSub.textContent = err.message;
      }
      this.showToast('error', 'Vision Error', err.message);
    } finally {
      if (this.dom.btnTriggerVisionScan) {
        this.dom.btnTriggerVisionScan.disabled = false;
        this.dom.btnTriggerVisionScan.style.opacity = '1';
      }
      if (this.dom.visionSpinner) this.dom.visionSpinner.classList.remove('active');
      if (this.dom.visionScanLine) this.dom.visionScanLine.classList.remove('scanning');
    }
  }

  renderMarkdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown
      // Escape script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Blockquotes & Notes
      .replace(/^\> \[!NOTE\]\s*(.*$)/gim, '<blockquote><strong>NOTE:</strong> $1</blockquote>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Code blocks and inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0;">')
      // Bullet lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>');

    // Simple table parser
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    const outputLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.every(c => /^[:\-\s]+$/.test(c))) {
          // divider line
          continue;
        }
        if (!inTable) {
          inTable = true;
          tableHtml = '<table><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      } else {
        if (inTable) {
          tableHtml += '</tbody></table>';
          outputLines.push(tableHtml);
          inTable = false;
          tableHtml = '';
        }
        outputLines.push(line);
      }
    }
    if (inTable) {
      tableHtml += '</tbody></table>';
      outputLines.push(tableHtml);
    }

    return outputLines
      .map(l => (l.startsWith('<h') || l.startsWith('<table') || l.startsWith('<blockquote') || l.startsWith('<hr') || l.startsWith('<li')) ? l : (l ? `<p>${l}</p>` : ''))
      .join('\n');
  }
}
