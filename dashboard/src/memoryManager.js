/**
 * MemoryManager: Client-side orchestrator for the IPTV Memory SQLite DB,
 * ML & RSI preference momentum, 'Must See' curated ranking with direct channel tuning,
 * text popup content alerts, and /curations list synchronization.
 */

export class MemoryManager {
  constructor(channelManager, onToast = console.log) {
    this.cm = channelManager;
    this.onToast = onToast;

    this.curations = [];
    this.activeCurationName = 'Must-See Prime';
    this.mustSeeList = [];
    this.currentAlert = null;
    this.alertPollInterval = null;
    this.dwellInterval = null;
    this.currentDwellSec = 0;
    this.lastTunedChannelId = null;
    this.favoriteChannelIds = new Set();
    this.onCurationFilterChange = null;

    // DOM bindings (assigned during init)
    this.dom = {};
  }

  init(domElements, onCurationFilterChange = null) {
    this.dom = domElements;
    this.onCurationFilterChange = onCurationFilterChange;
    this.bindEvents();
    this.loadFavorites();
    this.loadCurations();
    this.loadMustSeeList();
    this.startDwellTracking();
    this.startAlertPolling();
  }

  bindEvents() {
    // 1. Curation List Dropdown Change
    if (this.dom.curationListSelect) {
      this.dom.curationListSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        if (selected) {
          this.selectCuration(selected);
        }
      });
    }

    // 2. Tune Curation List (1-Click Tune to 1st Channel)
    if (this.dom.btnTuneCurationList) {
      this.dom.btnTuneCurationList.addEventListener('click', () => {
        this.tuneCurationList();
      });
    }

    // 3. Add Current Channel to Selected Curation
    if (this.dom.btnAddCurrentToCuration) {
      this.dom.btnAddCurrentToCuration.addEventListener('click', () => {
        this.addCurrentChannelToCuration();
      });
    }

    // 4. Clear Curation Filter (Show All Channels)
    if (this.dom.btnClearCurationFilter) {
      this.dom.btnClearCurationFilter.addEventListener('click', () => {
        this.clearCurationFilter();
      });
    }

    // 5. Save Curation Button
    if (this.dom.btnSaveCurationList) {
      this.dom.btnSaveCurationList.addEventListener('click', () => {
        const name = (this.dom.curationListNameInput?.value || '').trim();
        this.saveCurrentCuration(name);
      });
    }

    // 6. Curation Name Input: Auto-select text on click/focus and save on Enter
    if (this.dom.curationListNameInput) {
      this.dom.curationListNameInput.addEventListener('focus', () => {
        this.dom.curationListNameInput.select();
      });
      this.dom.curationListNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const name = (this.dom.curationListNameInput?.value || '').trim();
          this.saveCurrentCuration(name);
        }
      });
    }

    // 7. New Curation Button
    if (this.dom.btnNewCurationList) {
      this.dom.btnNewCurationList.addEventListener('click', () => {
        this.startNewCuration();
      });
    }

    // 8. Alert Popup Actions
    if (this.dom.btnAlertTuneChannel) {
      this.dom.btnAlertTuneChannel.addEventListener('click', () => {
        if (this.currentAlert) {
          this.tuneToAlertChannel(this.currentAlert);
        }
      });
    }

    if (this.dom.btnAlertDismiss) {
      this.dom.btnAlertDismiss.addEventListener('click', () => {
        this.dismissAlert();
      });
    }

    if (this.dom.btnCloseAlertPopup) {
      this.dom.btnCloseAlertPopup.addEventListener('click', () => {
        this.dismissAlert();
      });
    }

    // 5. Must-See Tab switcher (if tabs exist)
    if (this.dom.btnTabMustSee) {
      this.dom.btnTabMustSee.addEventListener('click', () => {
        this.switchLeftFlankTab('mustSee');
      });
    }
    if (this.dom.btnTabDossier) {
      this.dom.btnTabDossier.addEventListener('click', () => {
        this.switchLeftFlankTab('dossier');
      });
    }
  }

  switchLeftFlankTab(tabName) {
    if (tabName === 'mustSee') {
      if (this.dom.btnTabMustSee) this.dom.btnTabMustSee.classList.add('active');
      if (this.dom.btnTabDossier) this.dom.btnTabDossier.classList.remove('active');
      if (this.dom.dosContentTab) this.dom.dosContentTab.classList.add('hidden');
      if (this.dom.mustSeeTab) this.dom.mustSeeTab.classList.remove('hidden');
    } else {
      if (this.dom.btnTabDossier) this.dom.btnTabDossier.classList.add('active');
      if (this.dom.btnTabMustSee) this.dom.btnTabMustSee.classList.remove('active');
      if (this.dom.dosContentTab) this.dom.dosContentTab.classList.remove('hidden');
      if (this.dom.mustSeeTab) this.dom.mustSeeTab.classList.add('hidden');
    }
  }

  /**
   * Load current user favorites from the IPTV Memory DB
   */
  async loadFavorites() {
    try {
      const res = await fetch('/api/memory/favorites');
      if (res.ok) {
        const data = await res.json();
        this.favoriteChannelIds = new Set(data.favoriteChannelIds || []);
      }
    } catch (err) {
      console.warn('[MemoryManager] Error loading favorites:', err);
    }
  }

  /**
   * Check if channel is favorited
   */
  isChannelFavorited(channelId) {
    if (!channelId) return false;
    return this.favoriteChannelIds.has(channelId);
  }

  /**
   * Toggle favorite status for active channel and guide ML / RSI
   */
  async toggleFavorite(channel, findings = null) {
    if (!channel) return false;
    const isFav = !this.isChannelFavorited(channel.id);

    if (isFav) {
      this.favoriteChannelIds.add(channel.id);
    } else {
      this.favoriteChannelIds.delete(channel.id);
    }

    try {
      const res = await fetch('/api/memory/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channel.id,
          channel_name: channel.name,
          show_title: findings?.title || channel.textSummary?.contentFocus || channel.name,
          genre: channel.genre || channel.category || 'Cinema',
          director: findings?.director || '',
          dp: findings?.dp || '',
          camera: findings?.cameras || '',
          actors: findings?.actors || [],
          is_favorite: isFav
        })
      });

      if (res.ok) {
        this.onToast(
          isFav ? 'success' : 'info',
          isFav ? 'Added to Favorites' : 'Removed from Favorites',
          isFav 
            ? `Reinforcing ML & RSI preference momentum for '${channel.name}'. Must-See list updated!`
            : `Favorite removed for '${channel.name}'.`
        );
      }
    } catch (err) {
      console.error('[MemoryManager] Error updating favorite:', err);
    }

    // Immediately reload Must-See recommendations
    await this.loadMustSeeList();

    return isFav;
  }

  /**
   * Default built-in curations for rich offline & immediate access
   */
  getDefaultCurations() {
    return [
      {
        name: 'Must-See Prime',
        description: 'Premier news, sports, nature, and indie feature selections.',
        channels: [
          { id: 'accuweather-now', number: 101, name: 'AccuWeather NOW' },
          { id: 'abc-2020', number: 102, name: 'ABC 20/20 Investigative' },
          { id: 'fox-sports', number: 103, name: 'FOX Sports Live' },
          { id: 'alien-nation-dust', number: 104, name: 'Alien Nation by DUST' },
          { id: 'gravitas-movies', number: 105, name: 'Gravitas Movies' },
          { id: 'pbs-nature', number: 106, name: 'PBS Nature' },
          { id: 'documentary-plus', number: 107, name: 'Documentary+' },
          { id: 'afv-home-videos', number: 108, name: "America's Funniest Home Videos" }
        ],
        channelCount: 8
      },
      {
        name: 'Cinema & Masterworks',
        description: 'Independent films, award-winning dramas, and auteur documentaries.',
        channels: [
          { id: 'gravitas-movies', number: 105, name: 'Gravitas Movies' },
          { id: 'alien-nation-dust', number: 104, name: 'Alien Nation by DUST' },
          { id: 'documentary-plus', number: 107, name: 'Documentary+' },
          { id: 'bbc-comedy', number: 109, name: 'BBC Comedy Vault' },
          { id: '20min-paris', number: 115, name: '20 Minutes TV Paris' },
          { id: '3cat-directes', number: 117, name: '3Cat Directes Catalunya' }
        ],
        channelCount: 6
      },
      {
        name: 'Global News & Weather',
        description: 'Live continuous global journalism and meteorology.',
        channels: [
          { id: 'accuweather-now', number: 101, name: 'AccuWeather NOW' },
          { id: 'abc-2020', number: 102, name: 'ABC 20/20 Investigative' },
          { id: 'cbc-news', number: 112, name: 'CBC News International' },
          { id: '20min-paris', number: 115, name: '20 Minutes TV Paris' },
          { id: '7-radiovisione', number: 118, name: '7 RadioVisione Italia' }
        ],
        channelCount: 5
      },
      {
        name: 'Live Sports & Action',
        description: 'High-intensity athletic competitions and highlights.',
        channels: [
          { id: 'fox-sports', number: 103, name: 'FOX Sports Live' },
          { id: 'bondi-vet', number: 123, name: 'Bondi Vet Australia' },
          { id: 'baywatch-australia', number: 124, name: 'Baywatch Australia' },
          { id: '2gb-sydney', number: 125, name: '2GB Sydney Live' }
        ],
        channelCount: 4
      }
    ];
  }

  /**
   * Load curation lists from LocalStorage and /api/curations
   */
  async loadCurations() {
    // 1. Load local cache first
    try {
      const cached = JSON.parse(localStorage.getItem('iptv_custom_curations') || 'null');
      if (Array.isArray(cached) && cached.length > 0) {
        this.curations = cached;
      } else {
        this.curations = this.getDefaultCurations();
        localStorage.setItem('iptv_custom_curations', JSON.stringify(this.curations));
      }
    } catch {
      this.curations = this.getDefaultCurations();
    }

    // 2. Background sync with backend service if available
    try {
      const res = await fetch('/api/curations');
      if (res.ok) {
        const data = await res.json();
        if (data.curations && Array.isArray(data.curations) && data.curations.length > 0) {
          // Merge unique curations
          data.curations.forEach(remote => {
            const idx = this.curations.findIndex(c => c.name === remote.name);
            if (idx !== -1) {
              this.curations[idx] = Object.assign({}, this.curations[idx], remote);
            } else {
              this.curations.push(remote);
            }
          });
          localStorage.setItem('iptv_custom_curations', JSON.stringify(this.curations));
        }
      }
    } catch {
      // Backend offline fallback handled cleanly
    }

    this.populateCurationDropdown();

    // Auto-select current active curation
    if (this.curations.length > 0) {
      const initial = this.curations.find(c => c.name === this.activeCurationName) || this.curations[0];
      this.selectCuration(initial.name, false);
    }
  }

  populateCurationDropdown() {
    if (!this.dom.curationListSelect) return;
    this.dom.curationListSelect.innerHTML = '';

    this.curations.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      const count = c.channels ? c.channels.length : (c.channelCount || 0);
      opt.textContent = `${c.name} (${count} ch)`;
      if (c.name === this.activeCurationName) {
        opt.selected = true;
      }
      this.dom.curationListSelect.appendChild(opt);
    });

    if (this.dom.curationListNameInput && this.activeCurationName) {
      this.dom.curationListNameInput.value = this.activeCurationName;
    }
  }

  /**
   * User selects a curation from the dropdown:
   * Immediately filters the channel dock rail, updates the name input, and clarifies next actions!
   */
  async selectCuration(name, showToastNotification = true) {
    if (!name) return;
    this.activeCurationName = name;
    if (this.dom.curationListNameInput) {
      this.dom.curationListNameInput.value = name;
    }
    if (this.dom.curationListSelect) {
      this.dom.curationListSelect.value = name;
    }

    const curation = this.curations.find(c => c.name === name) || { name, channels: [] };
    const channels = curation.channels || [];
    const channelIds = channels.map(ch => ch.id || ch.channelId || ch.number);

    // Update status bar & action indicators
    if (this.dom.curationCountPill) {
      this.dom.curationCountPill.textContent = `${channelIds.length} CHANNELS`;
    }
    if (this.dom.curationFilterState) {
      this.dom.curationFilterState.textContent = `● Showing ${channelIds.length} Curated Channels`;
      this.dom.curationFilterState.style.color = 'var(--accent-green)';
    }
    if (this.dom.btnClearCurationFilter) {
      this.dom.btnClearCurationFilter.classList.remove('hidden');
    }

    // Notify UIController to filter the channel dock rail
    if (this.onCurationFilterChange) {
      this.onCurationFilterChange(name, channelIds, curation);
    }

    if (showToastNotification) {
      this.onToast('info', 'Curation Loaded', `Active list: '${name}' (${channelIds.length} channels). Dock filtered.`);
    }
  }

  /**
   * 1-Click Tune: Tunes to the first channel in the active curation list
   */
  tuneCurationList() {
    const curation = this.curations.find(c => c.name === this.activeCurationName);
    if (!curation || !curation.channels || curation.channels.length === 0) {
      this.onToast('info', 'Curation Empty', `List '${this.activeCurationName}' has no channels yet. Click '➕ ADD CH' to add the current channel.`);
      return;
    }

    const first = curation.channels[0];
    const chId = first.id || first.channelId;
    if (chId) {
      this.cm.tuneToId(chId);
      this.onToast('success', 'Tuning Curation', `Tuned to CH ${first.number || ''} (${first.name}) from '${this.activeCurationName}'.`);
    }
  }

  /**
   * Add currently playing channel into the active curation list
   */
  addCurrentChannelToCuration() {
    const curCh = this.cm.getActiveChannel();
    if (!curCh) return;

    let curation = this.curations.find(c => c.name === this.activeCurationName);
    if (!curation) {
      curation = {
        name: this.activeCurationName,
        description: `Custom curated broadcast list`,
        channels: [],
        channelCount: 0
      };
      this.curations.push(curation);
    }

    if (!curation.channels) curation.channels = [];

    // Check if channel is already present
    const exists = curation.channels.some(c => c.id === curCh.id || (c.number && c.number === curCh.number));
    if (exists) {
      this.onToast('info', 'Already in Curation', `CH ${curCh.number} (${curCh.name}) is already in '${this.activeCurationName}'.`);
      return;
    }

    curation.channels.push({
      id: curCh.id,
      number: curCh.number,
      name: curCh.name,
      category: curCh.category,
      genre: curCh.genre || curCh.category,
      callsign: curCh.callsign
    });
    curation.channelCount = curation.channels.length;

    // Persist to local storage
    try {
      localStorage.setItem('iptv_custom_curations', JSON.stringify(this.curations));
    } catch {}

    this.populateCurationDropdown();
    this.selectCuration(this.activeCurationName, false);
    this.onToast('success', 'Channel Added', `✓ Added CH ${curCh.number} (${curCh.name}) to '${this.activeCurationName}'.`);
  }

  /**
   * Clear Curation Filter: Resets dock rail to display all 15k / 24 channels
   */
  clearCurationFilter() {
    if (this.onCurationFilterChange) {
      this.onCurationFilterChange(null, null, null);
    }
    if (this.dom.curationFilterState) {
      this.dom.curationFilterState.textContent = '● All Channels Showing';
      this.dom.curationFilterState.style.color = 'var(--text-muted)';
    }
    if (this.dom.btnClearCurationFilter) {
      this.dom.btnClearCurationFilter.classList.add('hidden');
    }
    this.onToast('info', 'Filter Cleared', 'Showing all channels on the dock.');
  }

  /**
   * Start a new empty curation list
   */
  startNewCuration() {
    const defaultName = `Custom Lineup ${this.curations.length + 1}`;
    if (this.dom.curationListNameInput) {
      this.dom.curationListNameInput.value = defaultName;
      this.dom.curationListNameInput.focus();
      this.dom.curationListNameInput.select();
    }
    this.activeCurationName = defaultName;
    const newCur = {
      name: defaultName,
      description: 'Custom curated user list',
      channels: [],
      channelCount: 0
    };
    this.curations.push(newCur);
    try {
      localStorage.setItem('iptv_custom_curations', JSON.stringify(this.curations));
    } catch {}
    this.populateCurationDropdown();
    this.selectCuration(defaultName, false);
    this.onToast('success', 'New Curation Created', `Created '${defaultName}'. Click '➕ ADD CH' to add channels.`);
  }

  async saveCurrentCuration(name) {
    if (!name) {
      name = `Custom Curation ${new Date().toLocaleDateString()}`;
    }

    let curation = this.curations.find(c => c.name === this.activeCurationName);
    if (curation) {
      curation.name = name;
    } else {
      const curCh = this.cm.getActiveChannel();
      curation = {
        name: name,
        description: `Custom curated broadcast list`,
        channels: curCh ? [{ id: curCh.id, number: curCh.number, name: curCh.name }] : [],
        channelCount: curCh ? 1 : 0
      };
      this.curations.push(curation);
    }

    this.activeCurationName = name;

    // Save to localStorage
    try {
      localStorage.setItem('iptv_custom_curations', JSON.stringify(this.curations));
    } catch {}

    // Save to backend if online
    try {
      await fetch('/api/curations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(curation)
      });
    } catch {}

    this.populateCurationDropdown();
    this.onToast('success', 'Curation Saved', `Saved '${name}' with ${curation.channels?.length || 0} channels.`);
  }

  /**
   * Load user favorites from /api/memory/favorites
   */
  async loadFavorites() {
    try {
      const res = await fetch('/api/memory/favorites');
      if (res.ok) {
        const data = await res.json();
        this.favoriteChannelIds = new Set(data.favoriteChannelIds || []);
      }
    } catch (e) {
      console.warn('[MemoryManager] Error loading favorites:', e);
    }
  }

  isChannelFavorited(channelId) {
    if (!channelId) return false;
    return this.favoriteChannelIds.has(channelId);
  }

  /**
   * Toggle Favorite Status for active channel & current content
   * Injects high positive reinforcement into ML, RSI & Curation Engine
   */
  async toggleFavorite(channel, findings) {
    if (!channel) return false;
    const cid = channel.id;
    const isNowFav = !this.favoriteChannelIds.has(cid);

    if (isNowFav) {
      this.favoriteChannelIds.add(cid);
    } else {
      this.favoriteChannelIds.delete(cid);
    }

    const payload = {
      channel_id: cid,
      channel_name: channel.name,
      show_title: findings?.title || channel.name,
      genre: channel.genre || channel.category,
      director: findings?.director || '',
      dp: findings?.dp || '',
      camera: findings?.cameras || '',
      actors: findings?.actors || [],
      is_favorite: isNowFav
    };

    try {
      const res = await fetch('/api/memory/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await this.loadMustSeeList();
      }
    } catch (e) {
      console.warn('[MemoryManager] Error toggling favorite:', e);
    }

    return isNowFav;
  }

  /**
   * Curate Section: User approves or dismisses specific findings
   * Action: 'approve' (weight +5.0) or 'dismiss' (weight -4.0)
   * Precisely controls what is included or excluded from the ML/RSI knowledge base.
   */
  async curateSection(channel, sectionKey, action, features = {}) {
    if (!channel) return null;
    const payload = {
      channel_id: channel.id,
      channel_name: channel.name,
      show_title: features.show_title || channel.name,
      section_type: sectionKey,
      action: action, // 'approve' | 'dismiss'
      features: features
    };

    try {
      const res = await fetch('/api/memory/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        await this.loadMustSeeList();
        return data;
      }
    } catch (e) {
      console.warn('[MemoryManager] Error curating section:', e);
    }
    return null;
  }

  /**
   * Load 'Must See' ranked list from /api/memory/must-see (fallback to /must_see.json)
   */
  async loadMustSeeList() {
    try {
      const cur = this.cm.getActiveChannel();
      const q = cur?.id ? `?channelId=${encodeURIComponent(cur.id)}` : '';
      let res = await fetch(`/api/memory/must-see${q}`);
      if (!res.ok) {
        res = await fetch('/must_see.json');
      }
      if (res.ok) {
        const data = await res.json();
        this.mustSeeList = data.mustSee || [];
        this.renderMustSeeList();
      }
    } catch (e) {
      console.warn('[MemoryManager] Error fetching must-see list:', e);
    }
  }

  renderMustSeeList() {
    if (!this.dom.mustSeeItemsList) return;
    this.dom.mustSeeItemsList.innerHTML = '';

    if (this.mustSeeList.length === 0) {
      this.dom.mustSeeItemsList.innerHTML = `
        <div class="must-see-empty">
          <p>Analyzing broadcast signals and computing RSI momentum...</p>
        </div>
      `;
      return;
    }

    this.mustSeeList.slice(0, 10).forEach(item => {
      const card = document.createElement('div');
      card.className = `must-see-card ${item.isCurrentlyPlaying ? 'now-tuned' : ''}`;
      
      const badgeClass = item.rank === 1 ? 'rank-gold' : (item.rank === 2 ? 'rank-silver' : (item.rank === 3 ? 'rank-bronze' : ''));
      
      card.innerHTML = `
        <div class="ms-head">
          <div class="ms-rank-pill ${badgeClass}">#${item.rank} MUST-SEE</div>
          <div class="ms-score-pill" title="Relative Strength Index & Affinity Match Score">
            <span class="ms-match-val">${item.score}%</span>
            <span class="ms-rsi-val">RSI ${item.rsiScore}</span>
          </div>
        </div>
        <div class="ms-body">
          <h4 class="ms-title">${item.title}</h4>
          <div class="ms-meta">
            <span class="ms-ch-badge">CH ${item.channelNumber}</span>
            <span class="ms-ch-name">${item.channelName}</span>
            <span class="ms-flag">${item.flag || '🌐'}</span>
          </div>
          <p class="ms-logline">${item.logline || ''}</p>
          <div class="ms-reasons">
            <span class="reason-icon">⚡</span>
            <span class="reason-text">${item.matchReasons || item.genre}</span>
          </div>
        </div>
        <div class="ms-action">
          ${item.isCurrentlyPlaying ? 
            `<button class="btn-ms-tuned" disabled><span>● NOW PLAYING</span></button>` : 
            `<button class="btn-ms-tune" data-cid="${item.channelId}" data-cnum="${item.channelNumber}" title="Direct 1-Click Channel Switch">
               <span class="tune-icon">▶</span>
               <span>TUNE CH ${item.channelNumber}</span>
             </button>`
          }
        </div>
      `;

      // Wire direct 1-click tune link
      const btnTune = card.querySelector('.btn-ms-tune');
      if (btnTune) {
        btnTune.addEventListener('click', () => {
          this.recordInteraction('tune', {
            channel_id: item.channelId,
            channel_name: item.channelName,
            show_title: item.title,
            genre: item.genre,
            director: item.director,
            dp: item.dp,
            camera: item.camera,
            actors: item.actors
          });

          this.cm.tuneToId(item.channelId);
          this.onToast('success', 'Direct Tuned', `Switched to #${item.rank} Must-See: ${item.title} on CH ${item.channelNumber}`);
          setTimeout(() => this.loadMustSeeList(), 500);
        });
      }

      this.dom.mustSeeItemsList.appendChild(card);
    });
  }

  /**
   * Start tracking user dwell time on the tuned channel.
   * Logs dwell batches every 30 seconds into iptv_memory DB.
   */
  startDwellTracking() {
    this.dwellInterval = setInterval(() => {
      const active = this.cm.getActiveChannel();
      if (!active) return;

      this.currentDwellSec += 10;

      // Every 30s of continuous watch, record dwell interaction
      if (this.currentDwellSec >= 30) {
        this.recordInteraction('dwell', {
          channel_id: active.id,
          channel_name: active.name,
          dwell_seconds: this.currentDwellSec,
          genre: active.genre || active.category
        });
        this.currentDwellSec = 0;
      }
    }, 10000);
  }

  /**
   * Channel change notification hook.
   */
  onChannelChanged(channel) {
    if (!channel) return;
    this.lastTunedChannelId = channel.id;
    this.currentDwellSec = 0;

    // Record tune interaction
    this.recordInteraction('tune', {
      channel_id: channel.id,
      channel_name: channel.name,
      genre: channel.genre || channel.category,
      category: channel.category
    });

    // Refresh must-see rankings
    setTimeout(() => this.loadMustSeeList(), 600);
  }

  /**
   * Log interaction to /api/memory/event
   */
  async recordInteraction(eventType, payload = {}) {
    const data = Object.assign({
      event_type: eventType,
      timestamp: new Date().toISOString()
    }, payload);

    try {
      await fetch('/api/memory/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      // Background logging silently handles network drop
    }
  }

  /**
   * Poll for high-affinity content alerts every 15 seconds.
   */
  startAlertPolling() {
    this.alertPollInterval = setInterval(async () => {
      // Don't show new alert if one is already showing
      if (this.currentAlert) return;

      try {
        const cur = this.cm.getActiveChannel();
        const q = cur?.id ? `?channelId=${encodeURIComponent(cur.id)}` : '';
        const res = await fetch(`/api/memory/alerts${q}`);
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            this.triggerAlertPopup(data.alerts[0]);
          }
        }
      } catch (e) {
        // Silent poll fallback
      }
    }, 15000);
  }

  triggerAlertPopup(alert) {
    this.currentAlert = alert;
    if (!this.dom.contentAlertPopup) return;

    if (this.dom.alertScoreBadge) this.dom.alertScoreBadge.textContent = `${alert.score}% MATCH`;
    if (this.dom.alertShowTitle) this.dom.alertShowTitle.textContent = alert.title;
    if (this.dom.alertChannelName) this.dom.alertChannelName.textContent = `CH ${alert.channelNumber} • ${alert.channelName}`;
    if (this.dom.alertReason) this.dom.alertReason.textContent = alert.reason;

    this.dom.contentAlertPopup.classList.remove('hidden');
    this.dom.contentAlertPopup.classList.add('animate-slide-in');

    // Auto-dismiss after 20 seconds if not clicked
    setTimeout(() => {
      if (this.currentAlert && this.currentAlert.id === alert.id) {
        this.dismissAlert();
      }
    }, 20000);
  }

  tuneToAlertChannel(alert) {
    // Record positive reinforcement
    this.recordInteraction('alert_click', {
      channel_id: alert.channelId,
      channel_name: alert.channelName,
      show_title: alert.title
    });

    // Acknowledge alert on backend
    try {
      fetch('/api/memory/alerts/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.id, clicked: true })
      });
    } catch (e) {}

    // Tune channel
    this.cm.tuneToId(alert.channelId);
    this.onToast('success', 'Alert Tuned', `Switched to recommended content '${alert.title}' on CH ${alert.channelNumber}`);
    this.dismissAlert();
  }

  dismissAlert() {
    if (this.currentAlert) {
      try {
        fetch('/api/memory/alerts/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId: this.currentAlert.id, clicked: false })
        });
      } catch (e) {}
    }

    if (this.dom.contentAlertPopup) {
      this.dom.contentAlertPopup.classList.add('hidden');
    }
    this.currentAlert = null;
  }
}
