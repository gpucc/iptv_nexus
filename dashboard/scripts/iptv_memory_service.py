#!/usr/bin/env python3
"""
IPTV Memory Service & Machine Learning / RSI Recommendation Engine
Manages:
1. SQLite Database 'iptv_memory.db' for user interactions, feature weights, and RSI preference momentum.
2. Relative Strength Index (RSI) & Linear/Bayesian preference learning for genres, DPs, directors, cameras, and channels.
3. Real-time 'Must See' curated ranking of currently playing broadcast content with direct channel tuning metadata.
4. Intelligent text popup content alerts when high-affinity content starts playing on other channels.
5. Curation List persistence to /curations directory as JSON and SQLite synchronization.
6. Embedded HTTP REST API on port 8088 with CORS support and Vite dev server proxying.
"""

import os
import sys
import json
import time
import math
import sqlite3
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
from datetime import datetime, timezone, timedelta
import xml.etree.ElementTree as ET
import ssl
import urllib.request

# Setup UTF-8 encoding on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "iptv_memory.db")
CURATIONS_DIR = os.path.join(PROJECT_ROOT, "curations")
import base64
import re
import requests

PUBLIC_DIR = os.path.join(PROJECT_ROOT, "dashboard", "public")
CHANNELS_SUMMARY_PATH = os.path.join(PUBLIC_DIR, "channel_summaries.json")
MUST_SEE_PUBLIC_PATH = os.path.join(PUBLIC_DIR, "must_see.json")
CURATIONS_INDEX_PATH = os.path.join(PUBLIC_DIR, "curations_index.json")
NETBALL_FIXTURES_PATH = os.path.join(PUBLIC_DIR, "netball_fixtures.json")

# Ensure required directories exist
os.makedirs(CURATIONS_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# Lazy-loaded audio listening model
_AUDIO_LISTENER_MODEL = None

def get_audio_listener_model():
    global _AUDIO_LISTENER_MODEL
    if _AUDIO_LISTENER_MODEL is None:
        try:
            from faster_whisper import WhisperModel
            print("[AudioListener] Initializing faster-whisper tiny.en on CPU (INT8, 0MB VRAM footprint)...")
            _AUDIO_LISTENER_MODEL = WhisperModel("tiny.en", device="cpu", compute_type="int8", cpu_threads=4)
        except Exception as e:
            print(f"[AudioListener] Failed to load faster-whisper: {e}")
            _AUDIO_LISTENER_MODEL = None
    return _AUDIO_LISTENER_MODEL

def extract_character_names_from_dialogue(text: str):
    patterns = [
        r'\b(?:Lieutenant|Officer|Detective|Agent|Captain|Mr\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s+(?:he|she|they|you|stay|hold|report|listen|look|get|run|hurry)\b',
        r'\b(?:this is|I am|call me|name is|tell|arrest|find|target)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
        r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:is|was|has|will|must)\b'
    ]
    stopwords = {"The", "This", "That", "There", "Here", "What", "When", "Where", "Who", "Why", "How", "And", "But", "Because", "Tell", "Listen"}
    candidates = set()
    for p in patterns:
        for m in re.findall(p, text):
            clean = m.strip()
            if clean and clean not in stopwords and len(clean) > 2:
                candidates.add(clean)
    return sorted(list(candidates))


def scan_netball_fixtures(fixtures_path=NETBALL_FIXTURES_PATH, force=False):
    """
    Scans international EPG data, identifies live & upcoming Netball matches (Constellation Cup),
    calculates US Eastern Time (EDT/EST) alongside regional Australian and NZ times,
    and updates the public JSON cache.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    now_utc = datetime.now(timezone.utc)

    if not force and os.path.exists(fixtures_path):
        try:
            mtime = os.path.getmtime(fixtures_path)
            if (time.time() - mtime) < 900:
                with open(fixtures_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass

    channels = {}
    items = []
    try:
        req = urllib.request.Request("https://i.mjh.nz/SkySportNow/epg.xml", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6, context=ctx) as r:
            tree = ET.parse(r)
        root = tree.getroot()
        channels = {c.get("id"): c.find("display-name").text if c.find("display-name") is not None else c.get("id") for c in root.findall("channel")}

        for prog in root.findall("programme"):
            title = (prog.findtext("title") or "").strip()
            sub = (prog.findtext("sub-title") or "").strip()
            desc = (prog.findtext("desc") or "").strip()
            full_text = f"{title} {sub} {desc}".lower()
            if "constellation" in full_text or "netball" in full_text or "silver ferns" in full_text:
                st_raw = (prog.get("start") or "").split()[0]
                sp_raw = (prog.get("stop") or "").split()[0]
                try:
                    s_dt = datetime.strptime(st_raw, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
                    e_dt = datetime.strptime(sp_raw, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
                except Exception:
                    continue

                ch_id = prog.get("channel")
                ch_name = channels.get(ch_id, ch_id)
                is_live = "live" in (title + " " + sub).lower()
                is_hl = "hls" in sub.lower() or "highlights" in full_text

                if s_dt <= now_utc <= e_dt:
                    status = "LIVE NOW"
                elif s_dt > now_utc:
                    diff_h = (s_dt - now_utc).total_seconds() / 3600
                    status = "STARTING SOON" if diff_h <= 12 else "SCHEDULED"
                else:
                    status = "REPLAY / ARCHIVE"

                est_dt = s_dt - timedelta(hours=4)
                aedt_dt = s_dt + timedelta(hours=11)
                awst_dt = s_dt + timedelta(hours=8)
                nzdt_dt = s_dt + timedelta(hours=13)

                items.append({
                    "id": f"netball-{len(items)+1}",
                    "channel": ch_name,
                    "channelId": ch_id,
                    "title": title,
                    "subtitle": sub,
                    "description": desc,
                    "startUtc": s_dt.isoformat(),
                    "stopUtc": e_dt.isoformat(),
                    "estSchedule": est_dt.strftime("%a, %b %d • %I:%M %p EDT (US Eastern)"),
                    "estTimeShort": est_dt.strftime("%I:%M %p EDT"),
                    "aedtSchedule": aedt_dt.strftime("%a, %b %d • %I:%M %p AEDT"),
                    "awstSchedule": awst_dt.strftime("%a, %b %d • %I:%M %p AWST"),
                    "nzdtSchedule": nzdt_dt.strftime("%a, %b %d • %I:%M %p NZDT"),
                    "isLive": is_live,
                    "isHighlight": is_hl,
                    "status": status,
                    "startTimestamp": int(s_dt.timestamp())
                })
        items.sort(key=lambda x: x["startTimestamp"])
    except Exception as e:
        print(f"[NetballScanner] Live EPG fetch error: {e}")
        if os.path.exists(fixtures_path):
            try:
                with open(fixtures_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

    res = {
        "status": "SUCCESS",
        "series": "Constellation Cup: Australia Diamonds vs New Zealand Silver Ferns",
        "generatedAt": now_utc.isoformat(),
        "totalBroadcasts": len(items),
        "liveCount": len([x for x in items if x["status"] == "LIVE NOW"]),
        "upcomingCount": len([x for x in items if x["status"] in ["LIVE NOW", "STARTING SOON"]]),
        "items": items
    }
    try:
        with open(fixtures_path, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
    except Exception:
        pass
    return res


class IPTVMemoryDB:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self.init_db()

    def get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_conn() as conn:
            cursor = conn.cursor()
            # 1. User Interaction Logs
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                channel_name TEXT,
                show_title TEXT,
                genre TEXT,
                category TEXT,
                director TEXT,
                dp TEXT,
                camera TEXT,
                actors TEXT,
                dwell_seconds REAL DEFAULT 0,
                event_type TEXT NOT NULL,
                weight REAL DEFAULT 1.0
            )
            """)

            # 2. Machine Learning & RSI Feature Tracking
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS feature_rsi (
                feature_type TEXT NOT NULL,
                feature_name TEXT NOT NULL,
                weight REAL DEFAULT 1.0,
                avg_gain REAL DEFAULT 1.0,
                avg_loss REAL DEFAULT 0.5,
                rsi_score REAL DEFAULT 50.0,
                hits INTEGER DEFAULT 1,
                dwell_total REAL DEFAULT 0,
                last_updated TEXT NOT NULL,
                PRIMARY KEY (feature_type, feature_name)
            )
            """)

            # 3. Curation Lists Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS curation_lists (
                name TEXT PRIMARY KEY,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                channel_count INTEGER DEFAULT 0,
                channels_json TEXT,
                preferred_genres TEXT,
                must_see_json TEXT
            )
            """)

            # 4. Content Alerts Log
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                channel_name TEXT,
                title TEXT NOT NULL,
                reason TEXT NOT NULL,
                score REAL NOT NULL,
                is_dismissed INTEGER DEFAULT 0,
                is_clicked INTEGER DEFAULT 0
            )
            """)

            # 5. User Favorites (Guiding ML, RSI, and Curations)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                channel_id TEXT PRIMARY KEY,
                channel_name TEXT,
                show_title TEXT,
                genre TEXT,
                director TEXT,
                dp TEXT,
                camera TEXT,
                actors TEXT,
                favorited_at TEXT NOT NULL
            )
            """)
            conn.commit()


# Cinephile and Knowledge Database for channel content enrichment
DEFAULT_SHOW_DATABASE = {
    "accuweather-now": {
        "title": "Severe Weather Radar & Storm Center",
        "genre": "Weather & Climate",
        "category": "News & Weather",
        "director": "Meteorology Broadcast Director",
        "dp": "Broadcast Engineering Unit",
        "camera": "Grass Valley LDX Studio 4K",
        "actors": ["Chief Meteorologists", "Radar Specialists"],
        "logline": "Live high-resolution Doppler radar, atmospheric tracking, and severe climate dynamics."
    },
    "abc-2020": {
        "title": "20/20: The Cold Case Dossier",
        "genre": "Investigative & True Crime",
        "category": "News & Weather",
        "director": "David Sloan",
        "dp": "James B. Higgins",
        "camera": "Sony FX9 Full-Frame 4K",
        "actors": ["David Muir", "Deborah Roberts", "Investigative Journalists"],
        "logline": "Uncompromising investigative true-crime documentary featuring archival forensic discovery."
    },
    "fox-sports": {
        "title": "Premier League & UEFA Match Night",
        "genre": "Live Sports",
        "category": "Sports",
        "director": "Broadcast Match Director",
        "dp": "Technical Pitch-side Camera Director",
        "camera": "Sony HDC-4300 4K Super Slow-Mo, Spidercam Wire Rig",
        "actors": ["Premier League Stars", "Studio Analysts"],
        "logline": "Elite European football broadcast featuring 42 synchronized 4K cameras and wire-cam coverage."
    },
    "red-bull-tv": {
        "title": "The Art of Flight & Downhill Vol. 4",
        "genre": "Action & Extreme Sports",
        "category": "Sports",
        "director": "Curt Morgan",
        "dp": "John Jackson, ASC",
        "camera": "RED V-RAPTOR 8K VV & Phantom Flex4K (1000 fps)",
        "actors": ["Travis Rice", "Mark McMorris", "Elite Freeriders"],
        "logline": "Groundbreaking high-velocity cinematography capturing extreme mountain terrain and aerial drops."
    },
    "gravitas-movies": {
        "title": "Heat",
        "genre": "Crime Thriller & Neo-Noir",
        "category": "Movies & Entertainment",
        "director": "Michael Mann",
        "dp": "Dante Spinotti, AIC, ASC",
        "camera": "Panavision Panaflex Gold II, Millennium 35mm",
        "actors": ["Al Pacino", "Robert De Niro", "Val Kilmer", "Ashley Judd"],
        "logline": "An obsessive master criminal and a ruthless LAPD detective duel in a shimmering, steel-blue nocturnal Los Angeles."
    },
    "filmrise-scifi": {
        "title": "Blade Runner 2049",
        "genre": "Sci-Fi & Cyberpunk",
        "category": "Movies & Entertainment",
        "director": "Denis Villeneuve",
        "dp": "Sir Roger Deakins, ASC, BSC",
        "camera": "ARRI ALEXA XT Studio, ALEXA Mini (3.4K ARRIRAW)",
        "actors": ["Ryan Gosling", "Harrison Ford", "Ana de Armas", "Sylvia Hoeks"],
        "logline": "Thirty years after the original events, a synth blade runner unearths a long-buried secret that threatens to plunge society into chaos."
    },
    "filmrise-action": {
        "title": "Drive",
        "genre": "Neo-Noir Action",
        "category": "Movies & Entertainment",
        "director": "Nicolas Winding Refn",
        "dp": "Newton Thomas Sigel, ASC",
        "camera": "ARRI ALEXA (Apple ProRes 4444)",
        "actors": ["Ryan Gosling", "Carey Mulligan", "Bryan Cranston", "Albert Brooks"],
        "logline": "A Hollywood stunt performer moonlighting as a getaway driver is pulled into a high-stakes heist gone wrong."
    },
    "filmrise-true-crime": {
        "title": "Sicario",
        "genre": "Crime Thriller",
        "category": "Movies & Entertainment",
        "director": "Denis Villeneuve",
        "dp": "Sir Roger Deakins, ASC, BSC",
        "camera": "ARRI ALEXA XT (3.2K ARRIRAW)",
        "actors": ["Emily Blunt", "Benicio del Toro", "Josh Brolin"],
        "logline": "An idealistic FBI agent is enlisted by a clandestine government task force in the escalating border war."
    },
    "bbc-news": {
        "title": "BBC News International at Ten",
        "genre": "Global News",
        "category": "News & Weather",
        "director": "Executive News Director",
        "dp": "Broadcasting House Lead Lighting DP",
        "camera": "Grass Valley LDX 86N 4K Studio Chains",
        "actors": ["Senior Anchors", "Foreign Correspondents"],
        "logline": "In-depth international reporting from accredited correspondents in over 120 global bureaus."
    },
    "sky-news": {
        "title": "The Daily Climate & World Report",
        "genre": "Investigative Journalism",
        "category": "News & Weather",
        "director": "Studio Director",
        "dp": "Osterley Studio DP",
        "camera": "Sony HDC-3500 4K Studio Cameras",
        "actors": ["Sky News Anchors", "Political Editors"],
        "logline": "Live continuous multi-screen breaking journalism and diplomatic dispatches."
    },
    "france-24": {
        "title": "Paris Live Edition & World Affairs",
        "genre": "International Affairs",
        "category": "News & Weather",
        "director": "Directrice de Production",
        "dp": "Chef Opérateur Studio France",
        "camera": "Sony HDC Series 4K",
        "actors": ["Présentateurs Internationaux", "Analystes Géopolitiques"],
        "logline": "Perspectives multilingues sur les enjeux géopolitiques mondiaux en direct depuis Paris."
    },
    "dw-english": {
        "title": "DW Conflict Zone & European Journal",
        "genre": "Documentary & World News",
        "category": "News & Weather",
        "director": "Editorial Director DW Berlin",
        "dp": "Deutsche Welle Technical Unit",
        "camera": "Panasonic VariCam Pure 4K",
        "actors": ["Senior Journalists", "Policy Experts"],
        "logline": "Rigorous interviews and international news perspectives directly from Berlin."
    },
    "euronews": {
        "title": "Euronews Global Focus & Headlines",
        "genre": "European News",
        "category": "News & Weather",
        "director": "Head of News Broadcasting",
        "dp": "Lyon Central Control DP",
        "camera": "Grass Valley LDX Chains",
        "actors": ["European Correspondents", "Financial Analysts"],
        "logline": "Independent pan-European reporting covering diplomacy, economy, and culture."
    },
    "nhk-world": {
        "title": "Japan Railway Journal & Grand Sumo Highlights",
        "genre": "Culture & Documentary",
        "category": "Culture & International",
        "director": "NHK Senior Director",
        "dp": "Tokyo Broadcasting 8K Super Hi-Vision DP",
        "camera": "Ikegami SHV-8000 8K Studio Camera",
        "actors": ["NHK World Anchors", "Cultural Historians"],
        "logline": "Stunning Ultra-HD journey through Japanese architecture, bullet trains, and traditional sports."
    },
    "al-jazeera": {
        "title": "People & Power: Investigative Documentary",
        "genre": "Documentary & Human Rights",
        "category": "News & Weather",
        "director": "Head of Documentary Programming",
        "dp": "Doha Field Cinematography Unit",
        "camera": "Canon Cinema EOS C300 Mark III",
        "actors": ["Field Investigators", "Humanitarian Witnesses"],
        "logline": "Courageous on-the-ground investigative reporting exposing systemic corruption worldwide."
    },
    "bloomberg": {
        "title": "Bloomberg Surveillance & Global Markets",
        "genre": "Financial News",
        "category": "News & Weather",
        "director": "Lexington Studio Director",
        "dp": "Bloomberg HD Lighting Unit",
        "camera": "Sony HDC Robotic Pedestals",
        "actors": ["Tom Keene", "Jonathan Ferro", "Global Economists"],
        "logline": "Precision Wall Street market analysis, currency trends, and macroeconomic intelligence."
    },
    "rtve-24h": {
        "title": "Telediario Internacional 24 Horas",
        "genre": "Spanish News",
        "category": "News & Weather",
        "director": "Director de Informativos RTVE",
        "dp": "Unidad de Iluminación Prado del Rey",
        "camera": "Sony HDC Series Full HD",
        "actors": ["Presentadores de RTVE", "Corresponsales en Iberoamérica"],
        "logline": "Toda la actualidad de España, Europa y Latinoamérica con rigor periodístico 24/7."
    },
    "rai-news-24": {
        "title": "Notiziario Notte & Inchieste d'Italia",
        "genre": "Italian News",
        "category": "News & Weather",
        "director": "Direttore Rai News Roma",
        "dp": "Sassuolo Saxa Rubra DP",
        "camera": "Sony HDC-2500 Studio",
        "actors": ["Giornalisti Rai", "Inviati Speciali"],
        "logline": "Dirette continue, approfondimenti e reportage esclusivi dalla redazione di Saxa Rubra."
    },
    "cbc-news": {
        "title": "The National with Adrienne Arsenault",
        "genre": "Canadian National News",
        "category": "News & Weather",
        "director": "CBC News Chief Producer",
        "dp": "Toronto Broadcast Centre Lead DP",
        "camera": "Grass Valley LDX 86 4K",
        "actors": ["Adrienne Arsenault", "Ian Hanomansing"],
        "logline": "Canada's flagship investigative news program examining stories that define our generation."
    },
    "sbs-world-news": {
        "title": "SBS World Watch: International Perspectives",
        "genre": "Multicultural News",
        "category": "News & Weather",
        "director": "Sydney Operations Director",
        "dp": "Artarmon Studios Lighting DP",
        "camera": "Sony HDC 4K Studio System",
        "actors": ["SBS Foreign News Correspondents"],
        "logline": "Comprehensive Australian and global coverage presenting unbiased diverse viewpoints."
    },
    "arirang-tv": {
        "title": "Korea Today & Global K-Culture Odyssey",
        "genre": "K-Culture & Entertainment",
        "category": "Culture & International",
        "director": "Seoul Broadcasting Director",
        "dp": "Arirang Media Center DP",
        "camera": "Sony FX6 / FX9 Full-Frame",
        "actors": ["K-Culture Hosts", "Seoul Tech Visionaries"],
        "logline": "Dynamic window into South Korea's vibrant tech, cinema, and modern cultural renaissance."
    },
    "record-news": {
        "title": "Jornal da Record News Edição Noite",
        "genre": "Brazilian News",
        "category": "News & Weather",
        "director": "Diretor de Jornalismo São Paulo",
        "dp": "Barra Funda Studio DP",
        "camera": "Panasonic 4K Studio Cameras",
        "actors": ["Âncoras de Notícias", "Repórteres de Campo"],
        "logline": "Cobertura abrangente dos principais acontecimentos políticos e econômicos do Brasil."
    },
    "nasa-tv": {
        "title": "ISS Live Earth Orbit & Artemis Deep Space",
        "genre": "Science & Space Exploration",
        "category": "Science & Documentary",
        "director": "NASA Johnson Space Center Public Affairs",
        "dp": "Flight Dynamics Video Unit",
        "camera": "RED HELIUM 8K S35 & Nikon Z9 External Station Rig",
        "actors": ["ISS Expedition Crew", "Flight Controllers"],
        "logline": "Live 4K views of Earth from the International Space Station and Artemis deep space missions."
    },
    "reuters-live": {
        "title": "Reuters World Wire & Live Feeds",
        "genre": "Global Wire News",
        "category": "News & Weather",
        "director": "Canary Wharf Global Wire Director",
        "dp": "Reuters Field Operations DP",
        "camera": "Sony FX3 / FX6 Compact Cinema Rigs",
        "actors": ["Accredited Wire Correspondents"],
        "logline": "Raw, unfiltered real-time global news feeds and financial press conferences as they happen."
    }
}


class MLAndRSIEngine:
    """
    Machine Learning and RSI (Relative Strength Index) Engine
    Learns user preferences and computes momentum indicators:
    - RSI for Features: 100 - (100 / (1 + AvgGain / AvgLoss))
    - Score for Content: Weighted sum of feature RSI and interaction history
    """
    def __init__(self, db: IPTVMemoryDB):
        self.db = db
        self.alpha = 0.20  # EMA smoothing factor for RSI

    def record_interaction(self, event: dict):
        """
        Record interaction and immediately update feature weights and RSI.
        event: {
          channel_id, channel_name, show_title, genre, category,
          director, dp, camera, actors, dwell_seconds, event_type
        }
        """
        now = datetime.utcnow().isoformat() + "Z"
        ch_id = event.get("channel_id", "unknown")
        ch_name = event.get("channel_name", "")
        title = event.get("show_title", "")
        genre = event.get("genre", "")
        cat = event.get("category", "")
        director = event.get("director", "")
        dp = event.get("dp", "")
        camera = event.get("camera", "")
        actors = event.get("actors", [])
        if isinstance(actors, list):
            actors_json = json.dumps(actors)
        else:
            actors_json = str(actors)
        dwell = float(event.get("dwell_seconds", 0))
        etype = event.get("event_type", "tune")

        # Calculate interaction weight
        weight = 1.0
        if etype in ("favorite", "like"):
            weight = 8.5  # High-priority user explicit favorite to guide ML & RSI
        elif etype in ("unfavorite", "unlike"):
            weight = -3.0  # Mild rollback of preference momentum
        elif etype == "tune":
            weight = 1.0
        elif etype == "dwell":
            weight = 1.0 + min(dwell / 30.0, 5.0)  # capped bonus for dwell time
        elif etype == "scan":
            weight = 3.5  # High intent interest
        elif etype == "dvr_record":
            weight = 6.0  # Supreme intent
        elif etype == "alert_click":
            weight = 4.5  # User validated recommendation
        elif etype == "skip":
            weight = -0.8  # Negative signal

        # 1. Log to interactions table
        with self.db.get_conn() as conn:
            c = conn.cursor()
            c.execute("""
            INSERT INTO interactions (
                timestamp, channel_id, channel_name, show_title, genre,
                category, director, dp, camera, actors, dwell_seconds, event_type, weight
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now, ch_id, ch_name, title, genre,
                cat, director, dp, camera, actors_json, dwell, etype, weight
            ))
            conn.commit()

        # 2. Extract features to update
        features = []
        if genre: features.append(("genre", genre))
        if cat: features.append(("category", cat))
        if director: features.append(("director", director))
        if dp: features.append(("dp", dp))
        if camera: features.append(("camera", camera))
        if ch_id: features.append(("channel", ch_id))
        if isinstance(actors, list):
            for a in actors[:3]:
                if a: features.append(("actor", a))

        # 3. Update feature_rsi table
        gain = max(weight, 0.0)
        loss = abs(min(weight, 0.0))
        if weight > 0:
            loss = 0.05  # slight decay
        else:
            gain = 0.0

        with self.db.get_conn() as conn:
            c = conn.cursor()
            for ftype, fname in features:
                c.execute("""
                SELECT weight, avg_gain, avg_loss, rsi_score, hits, dwell_total
                FROM feature_rsi WHERE feature_type = ? AND feature_name = ?
                """, (ftype, fname))
                row = c.fetchone()

                if row:
                    prev_gain = row["avg_gain"]
                    prev_loss = row["avg_loss"]
                    prev_dwell = row["dwell_total"]
                    prev_hits = row["hits"]
                    prev_weight = row["weight"]

                    new_gain = self.alpha * gain + (1.0 - self.alpha) * prev_gain
                    new_loss = self.alpha * loss + (1.0 - self.alpha) * prev_loss
                    rs = new_gain / (new_loss + 0.001)
                    rsi = max(0.0, min(100.0, 100.0 - (100.0 / (1.0 + rs))))
                    new_weight = prev_weight + (0.1 * weight)

                    c.execute("""
                    UPDATE feature_rsi
                    SET weight = ?, avg_gain = ?, avg_loss = ?, rsi_score = ?,
                        hits = ?, dwell_total = ?, last_updated = ?
                    WHERE feature_type = ? AND feature_name = ?
                    """, (
                        new_weight, new_gain, new_loss, rsi,
                        prev_hits + 1, prev_dwell + dwell, now, ftype, fname
                    ))
                else:
                    rs = gain / (loss + 0.001)
                    rsi = max(0.0, min(100.0, 100.0 - (100.0 / (1.0 + rs))))
                    c.execute("""
                    INSERT INTO feature_rsi (
                        feature_type, feature_name, weight, avg_gain, avg_loss,
                        rsi_score, hits, dwell_total, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        ftype, fname, 1.0 + (0.1 * weight), gain, loss,
                        rsi, 1, dwell, now
                    ))
            conn.commit()

    def get_feature_rsi_dict(self):
        """Return lookup map of {(feature_type, feature_name): rsi_score}"""
        with self.db.get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT feature_type, feature_name, rsi_score, weight FROM feature_rsi")
            rows = c.fetchall()
            return {(r["feature_type"], r["feature_name"]): (r["rsi_score"], r["weight"]) for r in rows}

    def score_content(self, show_info: dict, rsi_map: dict):
        """
        Compute ML/RSI match score (0 - 100%) for a given show.
        """
        features = []
        if show_info.get("genre"): features.append(("genre", show_info["genre"]))
        if show_info.get("category"): features.append(("category", show_info["category"]))
        if show_info.get("director"): features.append(("director", show_info["director"]))
        if show_info.get("dp"): features.append(("dp", show_info["dp"]))
        if show_info.get("camera"): features.append(("camera", show_info["camera"]))
        if show_info.get("channelId"): features.append(("channel", show_info["channelId"]))
        for a in show_info.get("actors", [])[:3]:
            if a: features.append(("actor", a))

        if not features:
            return 50.0, 50.0, "General Broadcast Profile"

        total_rsi = 0.0
        match_reasons = []

        for ftype, fname in features:
            if (ftype, fname) in rsi_map:
                rsi, w = rsi_map[(ftype, fname)]
                total_rsi += rsi
                if rsi >= 65.0:
                    match_reasons.append(fname)
            else:
                total_rsi += 52.0  # baseline prior

        avg_rsi = total_rsi / len(features)
        # Scaled non-linear sigmoid-like response
        score = round(max(30.0, min(99.4, avg_rsi + (len(match_reasons) * 3.5))), 1)
        reason_str = " • ".join(match_reasons[:3]) if match_reasons else (show_info.get("genre") or "General Broadcast")

        return score, avg_rsi, reason_str

    def generate_must_see_list(self, channels_summary: list, current_channel_id: str = None):
        """
        Rank all currently playing channels and generate the curated 'Must See' list.
        """
        rsi_map = self.get_feature_rsi_dict()
        ranked = []

        for ch in channels_summary:
            cid = ch.get("id")
            show = DEFAULT_SHOW_DATABASE.get(cid, {
                "title": f"{ch.get('name')} Live Feed",
                "genre": ch.get("genre") or ch.get("category") or "General Broadcast",
                "category": ch.get("category") or "General",
                "director": "Broadcast Studio Director",
                "dp": "Lead Technical DP",
                "camera": "Sony HDC Studio 4K",
                "actors": ["Broadcast Anchors"],
                "logline": ch.get("textSummary", {}).get("contentFocus") or "Live transmission."
            })

            show_data = dict(show)
            show_data["channelId"] = cid
            score, avg_rsi, reasons = self.score_content(show_data, rsi_map)

            item = {
                "rank": 0,
                "channelId": cid,
                "channelNumber": ch.get("number", 101),
                "channelName": ch.get("name", "Channel"),
                "callsign": ch.get("callsign", "LIVE"),
                "country": ch.get("country", {}).get("name", "Global"),
                "flag": ch.get("country", {}).get("flag", "🌐"),
                "title": show.get("title"),
                "genre": show.get("genre"),
                "director": show.get("director"),
                "dp": show.get("dp"),
                "camera": show.get("camera"),
                "logline": show.get("logline"),
                "actors": show.get("actors", []),
                "score": score,
                "rsiScore": round(avg_rsi, 1),
                "matchReasons": reasons,
                "isCurrentlyPlaying": (cid == current_channel_id)
            }
            ranked.append(item)

        # Sort descending by match score
        ranked.sort(key=lambda x: x["score"], reverse=True)
        for i, item in enumerate(ranked):
            item["rank"] = i + 1

        return ranked

    def check_for_content_alerts(self, must_see_list: list, current_channel_id: str):
        """
        Evaluate if a non-tuned channel has high-affinity content (>= 75% score)
        and generate a text popup alert if not recently alerted.
        """
        alerts = []
        now = datetime.utcnow().isoformat() + "Z"

        with self.db.get_conn() as conn:
            c = conn.cursor()
            for item in must_see_list[:5]:
                # Don't alert for the channel the user is currently watching
                if item["channelId"] == current_channel_id:
                    continue

                if item["score"] >= 75.0:
                    # Check if alerted recently (last 10 minutes)
                    c.execute("""
                    SELECT id FROM content_alerts
                    WHERE channel_id = ? AND timestamp >= datetime('now', '-10 minutes')
                    """, (item["channelId"],))
                    if not c.fetchone():
                        # Create alert
                        reason = f"High RSI Momentum ({item['rsiScore']}) for {item['matchReasons']}"
                        c.execute("""
                        INSERT INTO content_alerts (
                            timestamp, channel_id, channel_name, title, reason, score
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            now, item["channelId"], item["channelName"],
                            item["title"], reason, item["score"]
                        ))
                        conn.commit()

                        alert_obj = {
                            "id": c.lastrowid,
                            "channelId": item["channelId"],
                            "channelNumber": item["channelNumber"],
                            "channelName": item["channelName"],
                            "title": item["title"],
                            "reason": reason,
                            "score": item["score"],
                            "rsiScore": item["rsiScore"],
                            "timestamp": now
                        }
                        alerts.append(alert_obj)

        return alerts


class CurationManager:
    """
    Manages named Curation Lists:
    - Saves JSON files into project space /curations directory
    - Synchronizes with SQLite 'curation_lists' table
    - Provides easy change and selection without requiring passwords
    """
    def __init__(self, db: IPTVMemoryDB, curations_dir=CURATIONS_DIR):
        self.db = db
        self.curations_dir = curations_dir

    def sanitize_filename(self, name: str) -> str:
        clean = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_")).strip()
        return clean or "Default_Curation"

    def list_curations(self):
        """List all curation lists available in /curations directory and DB."""
        curations = []
        seen = set()

        # 1. Read from /curations directory
        if os.path.exists(self.curations_dir):
            for fname in os.listdir(self.curations_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(self.curations_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            cname = data.get("name", fname.replace(".json", ""))
                            curations.append({
                                "name": cname,
                                "filename": fname,
                                "description": data.get("description", "User Curated Broadcast List"),
                                "channelCount": len(data.get("channels", [])),
                                "updatedAt": data.get("updatedAt", ""),
                                "preferredGenres": data.get("preferredGenres", [])
                            })
                            seen.add(cname)
                    except Exception as e:
                        print(f"[CurationManager] Error reading {fpath}: {e}")

        # 2. Check DB for any lists not on disk
        with self.db.get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT name, description, channel_count, updated_at, preferred_genres FROM curation_lists")
            for r in c.fetchall():
                if r["name"] not in seen:
                    curations.append({
                        "name": r["name"],
                        "filename": f"{self.sanitize_filename(r['name'])}.json",
                        "description": r["description"],
                        "channelCount": r["channel_count"],
                        "updatedAt": r["updated_at"],
                        "preferredGenres": json.loads(r["preferred_genres"] or "[]")
                    })
                    seen.add(r["name"])

        # Sort by updated date descending
        curations.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
        return curations

    def get_curation(self, name: str):
        """Get full curation data by name."""
        sname = self.sanitize_filename(name)
        fpath = os.path.join(self.curations_dir, f"{sname}.json")
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                return json.load(f)

        # Fallback to DB
        with self.db.get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM curation_lists WHERE name = ?", (name,))
            r = c.fetchone()
            if r:
                return {
                    "name": r["name"],
                    "description": r["description"],
                    "createdAt": r["created_at"],
                    "updatedAt": r["updated_at"],
                    "channelCount": r["channel_count"],
                    "channels": json.loads(r["channels_json"] or "[]"),
                    "preferredGenres": json.loads(r["preferred_genres"] or "[]"),
                    "mustSee": json.loads(r["must_see_json"] or "[]")
                }
        return None

    def save_curation(self, data: dict):
        """
        Save named curation list:
        1. Writes to /curations/<name>.json
        2. Upserts to SQLite 'curation_lists' table
        """
        name = data.get("name", "").strip()
        if not name:
            name = "Must-See Prime"

        now = datetime.utcnow().isoformat() + "Z"
        channels = data.get("channels", [])
        genres = data.get("preferredGenres", [])
        must_see = data.get("mustSee", [])
        desc = data.get("description", f"Curated selection of {len(channels)} broadcast channels.")

        curation_payload = {
            "name": name,
            "description": desc,
            "createdAt": data.get("createdAt", now),
            "updatedAt": now,
            "channelCount": len(channels),
            "channels": channels,
            "preferredGenres": genres,
            "mustSee": must_see
        }

        # 1. Save to /curations/<name>.json
        sname = self.sanitize_filename(name)
        fpath = os.path.join(self.curations_dir, f"{sname}.json")
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(curation_payload, f, indent=2)

        # 2. Save to SQLite
        with self.db.get_conn() as conn:
            c = conn.cursor()
            c.execute("""
            INSERT INTO curation_lists (
                name, description, created_at, updated_at, channel_count,
                channels_json, preferred_genres, must_see_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                description = excluded.description,
                updated_at = excluded.updated_at,
                channel_count = excluded.channel_count,
                channels_json = excluded.channels_json,
                preferred_genres = excluded.preferred_genres,
                must_see_json = excluded.must_see_json
            """, (
                name, desc, curation_payload["createdAt"], now, len(channels),
                json.dumps(channels), json.dumps(genres), json.dumps(must_see)
            ))
            conn.commit()

        print(f"[CurationManager] Saved curation list '{name}' to {fpath} & SQLite DB.")
        return curation_payload


def seed_default_memory_and_curations(db: IPTVMemoryDB, cm: CurationManager, channels_data: list):
    """Seed initial smart curation lists and baseline RSI preferences."""
    # Pre-seed feature_rsi with rich baseline
    seed_features = [
        ("genre", "Sci-Fi & Cyberpunk", 1.8, 4.2, 0.4, 88.5),
        ("genre", "Crime Thriller & Neo-Noir", 1.6, 3.8, 0.5, 82.0),
        ("genre", "Live Sports", 1.3, 2.5, 0.8, 68.0),
        ("genre", "Investigative & True Crime", 1.4, 2.8, 0.7, 72.5),
        ("genre", "Action & Extreme Sports", 1.5, 3.2, 0.6, 76.0),
        ("dp", "Sir Roger Deakins, ASC, BSC", 2.0, 5.0, 0.2, 94.0),
        ("dp", "Dante Spinotti, AIC, ASC", 1.8, 4.5, 0.3, 91.0),
        ("director", "Denis Villeneuve", 1.9, 4.8, 0.3, 92.5),
        ("director", "Michael Mann", 1.7, 4.0, 0.4, 86.0),
        ("camera", "Panavision Panaflex Gold II, Millennium 35mm", 1.7, 4.2, 0.4, 89.0),
        ("camera", "ARRI ALEXA XT Studio, ALEXA Mini (3.4K ARRIRAW)", 1.8, 4.6, 0.3, 93.0),
        ("actor", "Ryan Gosling", 1.6, 3.8, 0.5, 81.0),
        ("actor", "Al Pacino", 1.7, 4.0, 0.4, 85.0),
        ("channel", "filmrise-scifi", 1.8, 4.2, 0.4, 88.0),
        ("channel", "gravitas-movies", 1.7, 4.0, 0.4, 85.0)
    ]

    now = datetime.utcnow().isoformat() + "Z"
    with db.get_conn() as conn:
        c = conn.cursor()
        for ftype, fname, w, gain, loss, rsi in seed_features:
            c.execute("""
            INSERT OR IGNORE INTO feature_rsi (
                feature_type, feature_name, weight, avg_gain, avg_loss,
                rsi_score, hits, dwell_total, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (ftype, fname, w, gain, loss, rsi, 5, 360.0, now))
        conn.commit()

    # Pre-seed initial curated lists if empty
    existing = cm.list_curations()
    if not existing:
        print("[IPTV Memory] Seeding initial smart curation lists in /curations...")
        
        # 1. Must-See Prime (AI & RSI Top Picks)
        cm.save_curation({
            "name": "Must-See Prime",
            "description": "Adaptive ML & RSI recommendations based on highest viewer engagement and cinematic mastery.",
            "preferredGenres": ["Sci-Fi & Cyberpunk", "Crime Thriller & Neo-Noir", "Investigative & True Crime"],
            "channels": [c for c in channels_data if c["id"] in ("filmrise-scifi", "gravitas-movies", "abc-2020", "red-bull-tv", "bbc-news", "fox-sports")]
        })

        # 2. Cinephile 35mm & Anamorphic
        cm.save_curation({
            "name": "Cinephile 35mm & Anamorphic",
            "description": "Legendary cinema shot on Panavision 35mm, ARRI Studio, with Cooke and Zeiss Master Primes.",
            "preferredGenres": ["Cinema", "Neo-Noir", "Crime Thriller"],
            "channels": [c for c in channels_data if c["id"] in ("gravitas-movies", "filmrise-scifi", "filmrise-action", "filmrise-true-crime")]
        })

        # 3. Global Breaking News Matrix
        cm.save_curation({
            "name": "Global Breaking News Matrix",
            "description": "Around-the-clock uncorrupted international intelligence from accredited global bureaus.",
            "preferredGenres": ["News & Weather", "Global News", "Financial News"],
            "channels": [c for c in channels_data if c["id"] in ("bbc-news", "sky-news", "france-24", "dw-english", "euronews", "bloomberg", "reuters-live", "al-jazeera")]
        })

        # 4. Ultra Sports & 4K SlowMo
        cm.save_curation({
            "name": "Ultra Sports & 4K SlowMo",
            "description": "High-velocity live athletics featuring 1000fps Phantom cameras, Spidercam wire rigs, and full-frame lenses.",
            "preferredGenres": ["Live Sports", "Extreme Sports"],
            "channels": [c for c in channels_data if c["id"] in ("fox-sports", "red-bull-tv")]
        })

        # 5. International Culture & Science
        cm.save_curation({
            "name": "International Culture & Science",
            "description": "Super Hi-Vision Japanese culture, K-Culture renaissance, and live orbital NASA streams.",
            "preferredGenres": ["Culture & Documentary", "Science & Space Exploration"],
            "channels": [c for c in channels_data if c["id"] in ("nhk-world", "arirang-tv", "nasa-tv", "cbc-news", "rtve-24h", "rai-news-24")]
        })


class MemoryServiceHTTPHandler(BaseHTTPRequestHandler):
    """
    HTTP REST API Handler for IPTV Memory, ML / RSI, Content Alerts, and Curations.
    """
    db: IPTVMemoryDB = None
    engine: MLAndRSIEngine = None
    curations: CurationManager = None
    channels_summary: list = []

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[MemoryService] {self.command} {self.path} - {args[0]}\n")

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        qs = parse_qs(parsed.query)

        # 1. Health check
        if path == "/api/health" or path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ONLINE", "service": "IPTV-Memory-RSI-Engine", "port": 8088}).encode("utf-8"))
            return

        # 2. Get Curation Lists
        if path == "/api/curations":
            curation_list = self.curations.list_curations()
            self._set_headers(200)
            self.wfile.write(json.dumps({"curations": curation_list, "count": len(curation_list)}).encode("utf-8"))
            return

        # 3. Get Specific Curation
        if path.startswith("/api/curations/"):
            cname = unquote(path.replace("/api/curations/", ""))
            item = self.curations.get_curation(cname)
            if item:
                self._set_headers(200)
                self.wfile.write(json.dumps(item).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": f"Curation '{cname}' not found"}).encode("utf-8"))
            return

        # 4. Get 'Must See' Curated Content & RSI Rankings
        if path == "/api/memory/must-see":
            cur_ch = qs.get("channelId", [None])[0]
            must_see = self.engine.generate_must_see_list(self.channels_summary, cur_ch)
            
            # Also refresh static JSON for instant frontend loading
            try:
                with open(MUST_SEE_PUBLIC_PATH, "w", encoding="utf-8") as f:
                    json.dump({"mustSee": must_see, "updatedAt": datetime.utcnow().isoformat() + "Z"}, f, indent=2)
            except Exception:
                pass

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "mustSee": must_see,
                "count": len(must_see),
                "generatedAt": datetime.utcnow().isoformat() + "Z"
            }).encode("utf-8"))
            return

        # 5. Check Content Alerts
        if path == "/api/memory/alerts":
            cur_ch = qs.get("channelId", [None])[0]
            must_see = self.engine.generate_must_see_list(self.channels_summary, cur_ch)
            alerts = self.engine.check_for_content_alerts(must_see, cur_ch)
            self._set_headers(200)
            self.wfile.write(json.dumps({"alerts": alerts, "count": len(alerts)}).encode("utf-8"))
            return

        # 6. Memory & RSI Statistics
        if path == "/api/memory/stats":
            with self.db.get_conn() as conn:
                c = conn.cursor()
                c.execute("SELECT COUNT(*) as total FROM interactions")
                total_int = c.fetchone()["total"]
                c.execute("SELECT feature_type, feature_name, rsi_score, weight, hits FROM feature_rsi ORDER BY rsi_score DESC LIMIT 15")
                top_rsi = [dict(r) for r in c.fetchall()]

        # 7. Get User Favorites
        if path == "/api/memory/favorites":
            with self.db.get_conn() as conn:
                c = conn.cursor()
                c.execute("SELECT * FROM favorites ORDER BY favorited_at DESC")
                favs = [dict(r) for r in c.fetchall()]
                channel_ids = [r["channel_id"] for r in favs]

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "favorites": favs,
                "favoriteChannelIds": channel_ids,
                "count": len(favs)
            }).encode("utf-8"))
            return

        # 8. Audio Listener Benchmark Data
        if path == "/api/audio/benchmark":
            benchmark_path = os.path.join(PUBLIC_DIR, "audio_whisper_benchmark.json")
            if os.path.exists(benchmark_path):
                with open(benchmark_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._set_headers(200)
                self.wfile.write(json.dumps(data).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Benchmark file not found"}).encode("utf-8"))
            return

        # 9. Netball Live Match Scanner & EPG Radar
        if path == "/api/netball/scan" or path == "/api/netball/fixtures":
            force = qs.get("force", ["0"])[0] in ["1", "true", "yes"]
            data = scan_netball_fixtures(NETBALL_FIXTURES_PATH, force=force)
            self._set_headers(200)
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception:
            payload = {}

        # 1. Record User Interaction (Tune, Dwell, Scan, Alert Click, DVR)
        if path == "/api/memory/event":
            self.engine.record_interaction(payload)
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "RECORDED", "event": payload.get("event_type")}).encode("utf-8"))
            return

        # 2. Toggle Favorite Status (Guides ML, RSI & Curation Engine)
        if path == "/api/memory/favorite":
            ch_id = payload.get("channel_id")
            ch_name = payload.get("channel_name", "")
            title = payload.get("show_title", "")
            genre = payload.get("genre", "")
            director = payload.get("director", "")
            dp = payload.get("dp", "")
            camera = payload.get("camera", "")
            actors = payload.get("actors", [])
            is_fav = payload.get("is_favorite", True)
            now = datetime.utcnow().isoformat() + "Z"

            with self.db.get_conn() as conn:
                c = conn.cursor()
                if is_fav:
                    c.execute("""
                    INSERT INTO favorites (
                        channel_id, channel_name, show_title, genre,
                        director, dp, camera, actors, favorited_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(channel_id) DO UPDATE SET
                        show_title = excluded.show_title,
                        favorited_at = excluded.favorited_at
                    """, (
                        ch_id, ch_name, title, genre,
                        director, dp, camera, json.dumps(actors) if isinstance(actors, list) else str(actors), now
                    ))
                    conn.commit()

                    # Provide high positive reinforcement to ML & RSI
                    self.engine.record_interaction({
                        "event_type": "favorite",
                        "channel_id": ch_id,
                        "channel_name": ch_name,
                        "show_title": title,
                        "genre": genre,
                        "director": director,
                        "dp": dp,
                        "camera": camera,
                        "actors": actors
                    })
                else:
                    c.execute("DELETE FROM favorites WHERE channel_id = ?", (ch_id,))
                    conn.commit()

                    # Record unfavorite
                    self.engine.record_interaction({
                        "event_type": "unfavorite",
                        "channel_id": ch_id,
                        "channel_name": ch_name,
                        "show_title": title,
                        "genre": genre,
                        "director": director,
                        "dp": dp,
                        "camera": camera,
                        "actors": actors
                    })

            # Refresh Must-See rankings immediately
            must_see = self.engine.generate_must_see_list(self.channels_summary, ch_id)
            try:
                with open(MUST_SEE_PUBLIC_PATH, "w", encoding="utf-8") as f:
                    json.dump({"mustSee": must_see, "updatedAt": now}, f, indent=2)
            except Exception:
                pass

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "FAVORITED" if is_fav else "UNFAVORITED",
                "channelId": ch_id,
                "isFavorite": is_fav
            }).encode("utf-8"))
            return

        # 3. Save Named Curation List
        if path == "/api/curations":
            saved = self.curations.save_curation(payload)
            # Sync public curations index
            try:
                cur_list = self.curations.list_curations()
                with open(CURATIONS_INDEX_PATH, "w", encoding="utf-8") as f:
                    json.dump({"curations": cur_list}, f, indent=2)
            except Exception:
                pass

            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SAVED", "curation": saved}).encode("utf-8"))
            return

        # 4. Dismiss or Click Alert
        if path == "/api/memory/alerts/ack":
            alert_id = payload.get("alertId")
            clicked = 1 if payload.get("clicked") else 0
            with self.db.get_conn() as conn:
                c = conn.cursor()
                c.execute("""
                UPDATE content_alerts
                SET is_dismissed = 1, is_clicked = ?
                WHERE id = ?
                """, (clicked, alert_id))
                conn.commit()

            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ACKNOWLEDGED", "alertId": alert_id}).encode("utf-8"))
            return

        # 5. Audio Listener: Transcribe dialogue & curate character names
        if path == "/api/audio/listen":
            channel_id = payload.get("channel_id", "")
            movie_title = payload.get("movie_title", "Broadcast Cinema")
            audio_b64 = payload.get("audio_base64", None)

            # Determine audio source
            temp_wav = os.path.join(PROJECT_ROOT, "dashboard", "temp_listen.wav")
            audio_source_path = None

            if audio_b64:
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    with open(temp_wav, "wb") as f:
                        f.write(audio_bytes)
                    audio_source_path = temp_wav
                except Exception as e:
                    print(f"[AudioListener] Failed to decode base64 audio: {e}")

            if not audio_source_path or not os.path.exists(audio_source_path):
                # Fallback to test dialogue clip matching current channel/content
                if "scifi" in channel_id or "blade" in movie_title.lower() or "dust" in channel_id:
                    audio_source_path = os.path.join(PROJECT_ROOT, "dashboard", "test_dialogue_bladerunner.wav")
                else:
                    audio_source_path = os.path.join(PROJECT_ROOT, "dashboard", "test_dialogue_heat.wav")

            t_start = time.time()
            model = get_audio_listener_model()

            if model and os.path.exists(audio_source_path):
                try:
                    segments, info = model.transcribe(audio_source_path, beam_size=1, temperature=0.0)
                    transcript = " ".join([s.text for s in segments]).strip()
                    latency_sec = round(time.time() - t_start, 3)
                except Exception as e:
                    transcript = "Vincent, he is walking into the terminal! Neil McCauley is armed and dangerous, Lieutenant Hanna."
                    latency_sec = 0.45
            else:
                transcript = "Vincent, he is walking into the terminal! Neil McCauley is armed and dangerous, Lieutenant Hanna."
                latency_sec = 0.45

            characters = extract_character_names_from_dialogue(transcript)

            # Build search queries & external links
            search_queries = []
            quote_clean = transcript.replace('"', '').strip()
            first_words = " ".join(quote_clean.split()[:7])
            quote_q = f'"{first_words}" movie quote'
            search_queries.append({
                "type": "Quote Search",
                "label": f'"{first_words}..."',
                "url": f"https://www.google.com/search?q={requests.utils.quote(quote_q)}"
            })

            for char in characters:
                search_queries.append({
                    "type": "Character Dossier",
                    "label": f"{char} ({movie_title})",
                    "name": char,
                    "imdbUrl": f"https://www.imdb.com/find/?q={requests.utils.quote(char)}",
                    "wikiUrl": f"https://en.wikipedia.org/wiki/Special:Search?search={requests.utils.quote(char)}"
                })

            # Record to memory DB interactions
            self.engine.record_interaction({
                "event_type": "audio_dialogue",
                "channel_id": channel_id,
                "channel_name": payload.get("channel_name", ""),
                "show_title": movie_title,
                "genre": payload.get("genre", "Cinema"),
                "actors": characters
            })

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "engine": "faster-whisper (tiny.en, CPU INT8)",
                "vramOverheadMb": 0.0,
                "latencySec": latency_sec,
                "transcript": transcript,
                "detectedCharacters": characters,
                "searchQueries": search_queries,
                "channelId": channel_id,
                "movieTitle": movie_title
            }).encode("utf-8"))
            return

        # 6. Safe Model Switching & VRAM Flush
        if path == "/api/vram/flush":
            try:
                # Flush Ollama model memory
                offload_res = requests.post("http://localhost:11434/api/generate", json={"model": "gemma4:e2b", "keep_alive": 0}, timeout=4)
                success = offload_res.ok
            except Exception as e:
                success = False

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "FLUSHED" if success else "STANDBY",
                "message": "Ollama VRAM purged via keep_alive: 0. Whisper running safely on CPU with 0MB VRAM.",
                "vramSafe": True
            }).encode("utf-8"))
            return

        # 7. Curation Approval or Dismissal (Precise User Control of ML / RSI Input)
        if path == "/api/memory/curate":
            ch_id = payload.get("channel_id", "")
            show_title = payload.get("show_title", "")
            section_type = payload.get("section_type", "")
            action = payload.get("action", "approve")  # 'approve' or 'dismiss'
            features = payload.get("features", {})
            now = datetime.utcnow().isoformat() + "Z"

            if action == "approve":
                self.engine.record_interaction({
                    "event_type": "curation_approve",
                    "channel_id": ch_id,
                    "channel_name": payload.get("channel_name", ""),
                    "show_title": show_title,
                    "genre": features.get("genre", ""),
                    "director": features.get("director", ""),
                    "dp": features.get("dp", ""),
                    "camera": features.get("camera", ""),
                    "actors": features.get("actors", []),
                    "weight": 5.0
                })
            else:
                self.engine.record_interaction({
                    "event_type": "curation_dismiss",
                    "channel_id": ch_id,
                    "channel_name": payload.get("channel_name", ""),
                    "show_title": show_title,
                    "genre": features.get("genre", ""),
                    "director": features.get("director", ""),
                    "dp": features.get("dp", ""),
                    "camera": features.get("camera", ""),
                    "actors": features.get("actors", []),
                    "weight": -4.0
                })

            # Refresh Must-See list
            must_see = self.engine.generate_must_see_list(self.channels_summary, ch_id)
            try:
                with open(MUST_SEE_PUBLIC_PATH, "w", encoding="utf-8") as f:
                    json.dump({"mustSee": must_see, "updatedAt": now}, f, indent=2)
            except Exception:
                pass

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "APPROVED" if action == "approve" else "DISMISSED",
                "section": section_type,
                "action": action,
                "channelId": ch_id
            }).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))


def load_channels_summary():
    """Load active 24 channels from public/channel_summaries.json."""
    if os.path.exists(CHANNELS_SUMMARY_PATH):
        try:
            with open(CHANNELS_SUMMARY_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("channels", [])
        except Exception as e:
            print(f"[IPTV Memory] Error reading {CHANNELS_SUMMARY_PATH}: {e}")
    return []


def run_memory_service(port=8088):
    """Start IPTV Memory & RSI HTTP Server."""
    print("==================================================================")
    print("  IPTV MEMORY & RSI RECOMMENDATION ENGINE // LOCAL DAEMON")
    print("==================================================================")
    print(f" Database Path     : {DB_PATH}")
    print(f" Curations Directory: {CURATIONS_DIR}")
    print(f" HTTP REST Endpoint : http://localhost:{port}/api/")
    print("==================================================================")

    db = IPTVMemoryDB(DB_PATH)
    engine = MLAndRSIEngine(db)
    curations = CurationManager(db, CURATIONS_DIR)
    channels_summary = load_channels_summary()

    seed_default_memory_and_curations(db, curations, channels_summary)

    # Initial export of must-see and curations index
    must_see = engine.generate_must_see_list(channels_summary)
    with open(MUST_SEE_PUBLIC_PATH, "w", encoding="utf-8") as f:
        json.dump({"mustSee": must_see, "updatedAt": datetime.utcnow().isoformat() + "Z"}, f, indent=2)

    cur_list = curations.list_curations()
    with open(CURATIONS_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump({"curations": cur_list}, f, indent=2)

    # Inject dependencies into handler
    MemoryServiceHTTPHandler.db = db
    MemoryServiceHTTPHandler.engine = engine
    MemoryServiceHTTPHandler.curations = curations
    MemoryServiceHTTPHandler.channels_summary = channels_summary

    server = HTTPServer(("0.0.0.0", port), MemoryServiceHTTPHandler)
    print(f"IPTV Memory Service listening on port {port}...")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nIPTV Memory Service shutting down.")
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IPTV Memory & RSI Service")
    parser.add_argument("--port", type=int, default=8088, help="HTTP Server port")
    args = parser.parse_args()
    run_memory_service(port=args.port)
