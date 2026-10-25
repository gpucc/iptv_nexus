# Global Channel Directory & Multi-Dimensional Sorting Filter Engine

> **STATUS**: Operational & Validated  
> **SCOPE**: Complete 15,775+ International Channel Matrix across 177 Countries  
> **LAST UPDATED**: 2026-10-25  

---

## 1. Architectural Overview

The **Full Channel Lister** (`#globalDirectoryModal`) provides access to the complete catalog of 15,775 international IPTV channels indexed from 323 source playlists across 177 sovereign nations and territories.

Prior to this update, the lister offered only text search matching across names. It now provides a **Multi-Dimensional Sorting & Filtering Engine** enabling instant sorting and filtering across:
1. **Broadcast Resolution** ($4\text{K UHD } 2160\text{p} \to 1080\text{p FHD} \to 720\text{p HD} \to 540\text{p} \to 480\text{p SD}$)
2. **Country of Origin** (Alphabetical $A \to Z$ or $Z \to A$ with sovereign flags)
3. **Broadcast Language** (177-country mapping with dedicated UI badges)
4. **Channel Name** (Alphabetical $A \to Z$ or $Z \to A$)
5. **Channel Number** (Numerical sequence $1 \to 15,775$)

---

## 2. Multi-Dimensional Sorting Engine

### A. Broadcast Resolution Sorting
Resolutions are parsed from raw stream descriptors (`resolutionHint`, `rawName`, or `signalQuality.resolution`) into numeric vertical pixel heights:

$$\text{Height}(ch) = \begin{cases}
2160 & \text{if contains } \text{4K, UHD, or 2160} \\
1440 & \text{if contains } \text{1440} \\
1080 & \text{if contains } \text{1080 or FHD} \\
720 & \text{if contains } \text{720 or HD} \\
540 & \text{if contains } \text{540 or 576} \\
480 & \text{if contains } \text{480 or SD} \\
\text{regex}(P) & \text{for specific heights (e.g. 360p, 240p)} \\
720 & \text{fallback baseline}
\end{cases}$$

- **Default Order for Resolution**: **Descending** (highest fidelity first: $4\text{K} \to 1080\text{p} \to 720\text{p} \to \text{SD}$).
- **Tie-Breaker**: Alphabetical channel name.

### B. Country of Origin Sorting
- Evaluates `channel.country.name` using locale-aware collation (`localeCompare`).
- Secondary tie-breaker: `channel.name`.

### C. Broadcast Language Sorting
- Evaluates `channel.language` (mapped via `COUNTRY_LANGUAGE_MAP`).
- Secondary tie-breakers: `channel.country.name`, then `channel.name`.

### D. Alphabetical Channel Name Sorting
- Evaluates cleaned `channel.name` alphabetically ($A \to Z$ or $Z \to A$).

### E. Channel Number Sorting
- Evaluates `channel.channelNumber` numerically ($1 \to N$).

---

## 3. UI Controls & Interactive Features

### A. Dual Sorting Interaction Modes
1. **Toolbar Controls**:
   - `#directorySortSelect`: Quick dropdown to select the active sort key.
   - `#btnDirectorySortOrder`: Toggle button (`▲ ASC` / `▼ DESC`) with real-time directional icon updates.
2. **Interactive Table Column Headers**:
   - Headers (`CH #`, `COUNTRY`, `CHANNEL NAME`, `LANGUAGE`, `FORMAT / RES`, `CATEGORY`, `RESPONSIBLE COMPANY`) are interactive (`.sortable-th`).
   - Clicking a column header activates it as the primary sort key.
   - Clicking the already-active column header toggles between ascending and descending.
   - Active column displays a neon cyan underline and a directional arrow indicator (`▲` or `▼`).

### B. Visual Quality Badges
- **Language Badges** (`.badge-lang`): Purple/lavender pills displaying the primary broadcast language.
- **Resolution Badges** (`.badge-res`):
  - `.res-4k`: Glowing amber gold badge for 4K UHD.
  - `.res-1080p`: Bright neon cyan badge for 1080p Full HD.
  - `.res-720p`: Emerald green badge for 720p HD.
  - `.res-sd`: Neutral slate badge for standard definition (< 720p).

### C. Dimension Filters
- **Resolution Filter** (`#directoryResolutionFilter`): `ALL`, `4K`, `1080p`, `720p`, `SD`.
- **Language Filter** (`#directoryLanguageFilter`): Dynamically populated with all detected broadcast languages and channel counts.
- **Country Filter** (`#directoryCountryFilter`): Dynamically populated with all 177 sovereign nations with flags and channel counts.
- **Search Bar** (`#directorySearchInput`): Live text matching against Name, Country, Language, Category, Company, and Resolution string.
- **Reset Button** (`#btnResetDirectoryFilters`): Reverts all filters and sorting to defaults in one click.

### D. Virtualized Display & Pagination
- Displays initial 100 channels for maximum DOM responsiveness.
- **Load More Button** (`#btnDirectoryLoadMore`): Sleek button at the bottom of the table increments the display limit by +100 channels.
- Status badge displays real-time slice counts:  
  `Showing 100 of 15,775 channels (15,775 total) • Sort: Broadcast Resolution (High → Low)`

### E. Bottom Channel Dock Rail Sorting
- Added `#dockSortSelect` to the bottom 16:9 thumbnail carousel, allowing the docked channel rail to sort by Number, Name, Resolution, Country, or Language in sync with user preferences.

---

## 4. Data Pipeline & Schema Enrichment

1. **`dashboard/scripts/generate_complete_channels.py`**:
   - Maps country codes to language names via `COUNTRY_LANGUAGE_MAP`.
   - Embeds `"language"` into each channel object in master payloads.
2. **`dashboard/public/channels_complete.json`** & root `channels_complete.json`:
   - Enriched with `"language"` field on all 15,775 channel entries.
3. **`dashboard/public/channel_summaries.json`** & root `channel_summaries.json`:
   - Enriched with `"language"` field on the 24 active baseline channels.
4. **`dashboard/src/uiController.js`**:
   - Exports `resolveChannelLanguage`, `parseChannelResolutionHeight`, and `getResolutionBadgeMeta` for robust frontend fallback.
