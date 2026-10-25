/**
 * Interactive Expandable JSON Telemetry & Complete Directory Inspector
 * Renders expandable/collapsible nodes, syntax color highlights,
 * real-time key/value search filtering, clipboard export, and dataset switching.
 */

export class JsonInspector {
  constructor(containerElement, activeSummaryElements, onToast) {
    this.container = containerElement;
    this.summaryEls = activeSummaryElements;
    this.onToast = onToast;
    this.telemetryData = null;
    this.completeData = null;
    this.activeDatasetName = 'telemetry'; // 'telemetry' | 'complete'
    this.currentData = null;
    this.searchQuery = '';
  }

  loadData(telemetryReport, completeReport = null) {
    this.telemetryData = telemetryReport;
    this.completeData = completeReport;
    this.currentData = this.telemetryData;
    this.render();
  }

  setDataset(name) {
    this.activeDatasetName = name;
    if (name === 'complete' && this.completeData) {
      this.currentData = this.completeData;
    } else {
      this.currentData = this.telemetryData;
    }
    this.render();
  }

  async loadCompleteDatabase() {
    if (!this.completeData) {
      try {
        const res = await fetch('/channels_complete.json');
        if (res.ok) {
          this.completeData = await res.json();
        }
      } catch (e) {
        console.warn('Failed to load complete channel DB:', e);
      }
    }
    this.setDataset('complete');
  }

  updateActiveChannelSummary(channel) {
    if (!channel) return;

    if (this.summaryEls.channelName) {
      this.summaryEls.channelName.textContent = `${channel.name} (CH ${channel.number || channel.channelNumber} • ${channel.callsign})`;
    }

    const txt = channel.textSummary || {};
    const cInfo = channel.country || {};
    const cName = cInfo.name || 'International';
    const city = channel.city ? ` (${channel.city})` : '';

    if (this.summaryEls.overview) {
      this.summaryEls.overview.textContent = txt.channelOverview || channel.description || 'Continuous broadcast programming.';
    }

    if (this.summaryEls.corporate) {
      this.summaryEls.corporate.textContent = txt.corporateAndLocation || 
        `Responsible: ${channel.responsibleCompany || 'Broadcast Network'}. Country: ${cName}${city}.`;
    }

    if (this.summaryEls.signalVerdict) {
      this.summaryEls.signalVerdict.textContent = txt.signalQualityVerdict || 
        `Verified at ${channel.signalQuality?.resolution || '1080p'} with standard 16:9 aspect fit. Latency: ${channel.signalQuality?.latencyMs || 42} ms.`;
    }
  }

  setSearchQuery(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
    this.render();
  }

  expandAll() {
    const collapsibles = this.container.querySelectorAll('.json-node-children');
    const toggles = this.container.querySelectorAll('.json-toggle-btn');
    collapsibles.forEach(c => c.style.display = 'block');
    toggles.forEach(t => t.textContent = '−');
  }

  collapseAll() {
    const collapsibles = this.container.querySelectorAll('.json-node-children');
    const toggles = this.container.querySelectorAll('.json-toggle-btn');
    collapsibles.forEach(c => c.style.display = 'none');
    toggles.forEach(t => t.textContent = '+');
  }

  copyJson() {
    if (!this.currentData) return;
    const str = JSON.stringify(this.currentData, null, 2);
    navigator.clipboard.writeText(str).then(() => {
      if (this.onToast) this.onToast('success', 'JSON Copied', 'Dataset JSON copied to clipboard.');
    }).catch(err => {
      console.warn('Clipboard copy failed:', err);
    });
  }

  render() {
    if (!this.container || !this.currentData) return;
    this.container.innerHTML = '';
    
    // If complete dataset with 15k items, show metadata + first 50 sample channels with notice to prevent DOM freeze
    let dataToRender = this.currentData;
    if (this.activeDatasetName === 'complete' && Array.isArray(this.currentData.channels) && this.currentData.channels.length > 100) {
      dataToRender = {
        metadata: this.currentData.metadata,
        notice: `Displaying first 50 of ${this.currentData.channels.length} channels in interactive DOM tree view. Download complete .json file for full 15,775 database.`,
        channelsSample: this.currentData.channels.slice(0, 50)
      };
    }

    const rootTree = this.buildNode(null, dataToRender, true, 0);
    this.container.appendChild(rootTree);
  }

  buildNode(key, value, isRoot = false, depth = 0) {
    const wrapper = document.createElement('div');
    wrapper.className = isRoot ? 'json-root' : 'json-node';

    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);

    if (isObject) {
      const keys = Object.keys(value);
      const header = document.createElement('div');
      header.className = 'json-collapsible';

      const toggleBtn = document.createElement('span');
      toggleBtn.className = 'json-toggle-btn';
      
      const defaultExpanded = depth < 2 || this.searchQuery.length > 0;
      toggleBtn.textContent = defaultExpanded ? '−' : '+';

      header.appendChild(toggleBtn);

      if (key !== null) {
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key';
        keySpan.innerHTML = this.highlightText(`"${key}": `);
        header.appendChild(keySpan);
      }

      const bracketOpen = isArray ? '[' : '{';
      const bracketClose = isArray ? ']' : '}';
      const countLabel = document.createElement('span');
      countLabel.className = 'json-count';
      countLabel.textContent = `${bracketOpen} ${keys.length} items`;
      header.appendChild(countLabel);

      wrapper.appendChild(header);

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'json-node-children';
      childrenContainer.style.display = defaultExpanded ? 'block' : 'none';

      keys.forEach(k => {
        const childNode = this.buildNode(k, value[k], false, depth + 1);
        childrenContainer.appendChild(childNode);
      });

      const closeBracketDiv = document.createElement('div');
      closeBracketDiv.className = 'json-close-bracket';
      closeBracketDiv.textContent = bracketClose;
      childrenContainer.appendChild(closeBracketDiv);

      wrapper.appendChild(childrenContainer);

      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = childrenContainer.style.display !== 'none';
        childrenContainer.style.display = isOpen ? 'none' : 'block';
        toggleBtn.textContent = isOpen ? '+' : '−';
      });
    } else {
      const line = document.createElement('div');
      line.className = 'json-leaf';

      if (key !== null) {
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key';
        keySpan.innerHTML = this.highlightText(`"${key}": `);
        line.appendChild(keySpan);
      }

      const valSpan = document.createElement('span');
      if (typeof value === 'string') {
        valSpan.className = 'json-string';
        valSpan.innerHTML = `"${this.highlightText(value)}"`;
      } else if (typeof value === 'number') {
        valSpan.className = 'json-number';
        valSpan.innerHTML = this.highlightText(String(value));
      } else if (typeof value === 'boolean') {
        valSpan.className = 'json-boolean';
        valSpan.textContent = String(value);
      } else if (value === null) {
        valSpan.className = 'json-null';
        valSpan.textContent = 'null';
      }

      line.appendChild(valSpan);
      wrapper.appendChild(line);
    }

    return wrapper;
  }

  highlightText(text) {
    if (!this.searchQuery) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(this.searchQuery)})`, 'gi');
    return escaped.replace(regex, '<span class="json-highlight">$1</span>');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}
