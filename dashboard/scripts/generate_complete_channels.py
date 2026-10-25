import os
import glob
import re
import json
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
STREAMS_DIR = os.path.join(PROJECT_ROOT, "iptv", "streams")
OUTPUT_ROOT = os.path.join(PROJECT_ROOT, "channels_complete.json")
OUTPUT_PUBLIC = os.path.join(PROJECT_ROOT, "dashboard", "public", "channels_complete.json")
SUMMARIES_PUBLIC = os.path.join(PROJECT_ROOT, "dashboard", "public", "channel_summaries.json")
SUMMARIES_ROOT = os.path.join(PROJECT_ROOT, "channel_summaries.json")

COUNTRY_MAP = {
    "ad": {"name": "Andorra", "flag": "🇦🇩", "continent": "Europe"},
    "ae": {"name": "United Arab Emirates", "flag": "🇦🇪", "continent": "Asia"},
    "af": {"name": "Afghanistan", "flag": "🇦🇫", "continent": "Asia"},
    "ag": {"name": "Antigua and Barbuda", "flag": "🇦🇬", "continent": "Americas"},
    "al": {"name": "Albania", "flag": "🇦🇱", "continent": "Europe"},
    "am": {"name": "Armenia", "flag": "🇦🇲", "continent": "Asia"},
    "ao": {"name": "Angola", "flag": "🇦🇴", "continent": "Africa"},
    "ar": {"name": "Argentina", "flag": "🇦🇷", "continent": "Americas"},
    "at": {"name": "Austria", "flag": "🇦🇹", "continent": "Europe"},
    "au": {"name": "Australia", "flag": "🇦🇺", "continent": "Oceania"},
    "aw": {"name": "Aruba", "flag": "🇦🇼", "continent": "Americas"},
    "az": {"name": "Azerbaijan", "flag": "🇦🇿", "continent": "Asia"},
    "ba": {"name": "Bosnia and Herzegovina", "flag": "🇧🇦", "continent": "Europe"},
    "bb": {"name": "Barbados", "flag": "🇧🇧", "continent": "Americas"},
    "bd": {"name": "Bangladesh", "flag": "🇧🇩", "continent": "Asia"},
    "be": {"name": "Belgium", "flag": "🇧🇪", "continent": "Europe"},
    "bf": {"name": "Burkina Faso", "flag": "🇧🇫", "continent": "Africa"},
    "bg": {"name": "Bulgaria", "flag": "🇧🇬", "continent": "Europe"},
    "bh": {"name": "Bahrain", "flag": "🇧🇭", "continent": "Asia"},
    "bi": {"name": "Burundi", "flag": "🇧🇮", "continent": "Africa"},
    "bj": {"name": "Benin", "flag": "🇧🇯", "continent": "Africa"},
    "bm": {"name": "Bermuda", "flag": "🇧🇲", "continent": "Americas"},
    "bn": {"name": "Brunei", "flag": "🇧🇳", "continent": "Asia"},
    "bo": {"name": "Bolivia", "flag": "🇧🇴", "continent": "Americas"},
    "br": {"name": "Brazil", "flag": "🇧🇷", "continent": "Americas"},
    "bs": {"name": "Bahamas", "flag": "🇧🇸", "continent": "Americas"},
    "by": {"name": "Belarus", "flag": "🇧🇾", "continent": "Europe"},
    "bz": {"name": "Belize", "flag": "🇧🇿", "continent": "Americas"},
    "ca": {"name": "Canada", "flag": "🇨🇦", "continent": "Americas"},
    "cd": {"name": "DR Congo", "flag": "🇨🇩", "continent": "Africa"},
    "cf": {"name": "Central African Republic", "flag": "🇨🇫", "continent": "Africa"},
    "cg": {"name": "Congo", "flag": "🇨🇬", "continent": "Africa"},
    "ch": {"name": "Switzerland", "flag": "🇨🇭", "continent": "Europe"},
    "ci": {"name": "Ivory Coast", "flag": "🇨🇮", "continent": "Africa"},
    "cl": {"name": "Chile", "flag": "🇨🇱", "continent": "Americas"},
    "cm": {"name": "Cameroon", "flag": "🇨🇲", "continent": "Africa"},
    "cn": {"name": "China", "flag": "🇨🇳", "continent": "Asia"},
    "co": {"name": "Colombia", "flag": "🇨🇴", "continent": "Americas"},
    "cr": {"name": "Costa Rica", "flag": "🇨🇷", "continent": "Americas"},
    "cu": {"name": "Cuba", "flag": "🇨🇺", "continent": "Americas"},
    "cv": {"name": "Cape Verde", "flag": "🇨🇻", "continent": "Africa"},
    "cw": {"name": "Curaçao", "flag": "🇨🇼", "continent": "Americas"},
    "cy": {"name": "Cyprus", "flag": "🇨🇾", "continent": "Europe"},
    "cz": {"name": "Czech Republic", "flag": "🇨🇿", "continent": "Europe"},
    "de": {"name": "Germany", "flag": "🇩🇪", "continent": "Europe"},
    "dk": {"name": "Denmark", "flag": "🇩🇰", "continent": "Europe"},
    "do": {"name": "Dominican Republic", "flag": "🇩🇴", "continent": "Americas"},
    "dz": {"name": "Algeria", "flag": "🇩🇿", "continent": "Africa"},
    "ec": {"name": "Ecuador", "flag": "🇪🇨", "continent": "Americas"},
    "ee": {"name": "Estonia", "flag": "🇪🇪", "continent": "Europe"},
    "eg": {"name": "Egypt", "flag": "🇪🇬", "continent": "Africa"},
    "es": {"name": "Spain", "flag": "🇪🇸", "continent": "Europe"},
    "fi": {"name": "Finland", "flag": "🇫🇮", "continent": "Europe"},
    "fr": {"name": "France", "flag": "🇫🇷", "continent": "Europe"},
    "ge": {"name": "Georgia", "flag": "🇬🇪", "continent": "Asia"},
    "gh": {"name": "Ghana", "flag": "🇬🇭", "continent": "Africa"},
    "gr": {"name": "Greece", "flag": "🇬🇷", "continent": "Europe"},
    "gt": {"name": "Guatemala", "flag": "🇬🇹", "continent": "Americas"},
    "hk": {"name": "Hong Kong", "flag": "🇭🇰", "continent": "Asia"},
    "hn": {"name": "Honduras", "flag": "🇭🇳", "continent": "Americas"},
    "hr": {"name": "Croatia", "flag": "🇭🇷", "continent": "Europe"},
    "hu": {"name": "Hungary", "flag": "🇭🇺", "continent": "Europe"},
    "id": {"name": "Indonesia", "flag": "🇮🇩", "continent": "Asia"},
    "ie": {"name": "Ireland", "flag": "🇮🇪", "continent": "Europe"},
    "il": {"name": "Israel", "flag": "🇮🇱", "continent": "Asia"},
    "in": {"name": "India", "flag": "🇮🇳", "continent": "Asia"},
    "iq": {"name": "Iraq", "flag": "🇮🇶", "continent": "Asia"},
    "ir": {"name": "Iran", "flag": "🇮🇷", "continent": "Asia"},
    "is": {"name": "Iceland", "flag": "🇮🇸", "continent": "Europe"},
    "it": {"name": "Italy", "flag": "🇮🇹", "continent": "Europe"},
    "jm": {"name": "Jamaica", "flag": "🇯🇲", "continent": "Americas"},
    "jo": {"name": "Jordan", "flag": "🇯🇴", "continent": "Asia"},
    "jp": {"name": "Japan", "flag": "🇯🇵", "continent": "Asia"},
    "ke": {"name": "Kenya", "flag": "🇰🇪", "continent": "Africa"},
    "kr": {"name": "South Korea", "flag": "🇰🇷", "continent": "Asia"},
    "kw": {"name": "Kuwait", "flag": "🇰🇼", "continent": "Asia"},
    "kz": {"name": "Kazakhstan", "flag": "🇰🇿", "continent": "Asia"},
    "lb": {"name": "Lebanon", "flag": "🇱🇧", "continent": "Asia"},
    "lk": {"name": "Sri Lanka", "flag": "🇱🇰", "continent": "Asia"},
    "lt": {"name": "Lithuania", "flag": "🇱🇹", "continent": "Europe"},
    "lu": {"name": "Luxembourg", "flag": "🇱🇺", "continent": "Europe"},
    "lv": {"name": "Latvia", "flag": "🇱🇻", "continent": "Europe"},
    "ma": {"name": "Morocco", "flag": "🇲🇦", "continent": "Africa"},
    "mc": {"name": "Monaco", "flag": "🇲🇨", "continent": "Europe"},
    "md": {"name": "Moldova", "flag": "🇲🇩", "continent": "Europe"},
    "me": {"name": "Montenegro", "flag": "🇲🇪", "continent": "Europe"},
    "mk": {"name": "North Macedonia", "flag": "🇲🇰", "continent": "Europe"},
    "mm": {"name": "Myanmar", "flag": "🇲🇲", "continent": "Asia"},
    "mn": {"name": "Mongolia", "flag": "🇲🇳", "continent": "Asia"},
    "mo": {"name": "Macau", "flag": "🇲🇴", "continent": "Asia"},
    "mt": {"name": "Malta", "flag": "🇲🇹", "continent": "Europe"},
    "mx": {"name": "Mexico", "flag": "🇲🇽", "continent": "Americas"},
    "my": {"name": "Malaysia", "flag": "🇲🇾", "continent": "Asia"},
    "ng": {"name": "Nigeria", "flag": "🇳🇬", "continent": "Africa"},
    "ni": {"name": "Nicaragua", "flag": "🇳🇮", "continent": "Americas"},
    "nl": {"name": "Netherlands", "flag": "🇳🇱", "continent": "Europe"},
    "no": {"name": "Norway", "flag": "🇳🇴", "continent": "Europe"},
    "np": {"name": "Nepal", "flag": "🇳🇵", "continent": "Asia"},
    "nz": {"name": "New Zealand", "flag": "🇳🇿", "continent": "Oceania"},
    "pa": {"name": "Panama", "flag": "🇵🇦", "continent": "Americas"},
    "pe": {"name": "Peru", "flag": "🇵🇪", "continent": "Americas"},
    "ph": {"name": "Philippines", "flag": "🇵🇭", "continent": "Asia"},
    "pk": {"name": "Pakistan", "flag": "🇵🇰", "continent": "Asia"},
    "pl": {"name": "Poland", "flag": "🇵🇱", "continent": "Europe"},
    "pr": {"name": "Puerto Rico", "flag": "🇵🇷", "continent": "Americas"},
    "ps": {"name": "Palestine", "flag": "🇵🇸", "continent": "Asia"},
    "pt": {"name": "Portugal", "flag": "🇵🇹", "continent": "Europe"},
    "py": {"name": "Paraguay", "flag": "🇵🇾", "continent": "Americas"},
    "qa": {"name": "Qatar", "flag": "🇶🇦", "continent": "Asia"},
    "ro": {"name": "Romania", "flag": "🇷🇴", "continent": "Europe"},
    "rs": {"name": "Serbia", "flag": "🇷🇸", "continent": "Europe"},
    "ru": {"name": "Russia", "flag": "🇷🇺", "continent": "Europe/Asia"},
    "sa": {"name": "Saudi Arabia", "flag": "🇸🇦", "continent": "Asia"},
    "se": {"name": "Sweden", "flag": "🇸🇪", "continent": "Europe"},
    "sg": {"name": "Singapore", "flag": "🇸🇬", "continent": "Asia"},
    "sk": {"name": "Slovakia", "flag": "🇸🇰", "continent": "Europe"},
    "sn": {"name": "Senegal", "flag": "🇸🇳", "continent": "Africa"},
    "th": {"name": "Thailand", "flag": "🇹🇭", "continent": "Asia"},
    "tr": {"name": "Turkey", "flag": "🇹🇷", "continent": "Europe/Asia"},
    "tw": {"name": "Taiwan", "flag": "🇹🇼", "continent": "Asia"},
    "ua": {"name": "Ukraine", "flag": "🇺🇦", "continent": "Europe"},
    "uk": {"name": "United Kingdom", "flag": "🇬🇧", "continent": "Europe"},
    "us": {"name": "United States", "flag": "🇺🇸", "continent": "Americas"},
    "uy": {"name": "Uruguay", "flag": "🇺🇾", "continent": "Americas"},
    "ve": {"name": "Venezuela", "flag": "🇻🇪", "continent": "Americas"},
    "vn": {"name": "Vietnam", "flag": "🇻🇳", "continent": "Asia"},
    "za": {"name": "South Africa", "flag": "🇿🇦", "continent": "Africa"}
}

COUNTRY_LANGUAGE_MAP = {
    "ad": "Catalan", "ae": "Arabic", "af": "Pashto", "ag": "English", "al": "Albanian",
    "am": "Armenian", "ao": "Portuguese", "ar": "Spanish", "at": "German", "au": "English",
    "aw": "Dutch", "az": "Azerbaijani", "ba": "Bosnian", "bb": "English", "bd": "Bengali",
    "be": "French", "bf": "French", "bg": "Bulgarian", "bh": "Arabic", "bi": "Kirundi",
    "bj": "French", "bm": "English", "bn": "Malay", "bo": "Spanish", "bq": "Dutch",
    "br": "Portuguese", "bs": "English", "bt": "Dzongkha", "bw": "English", "by": "Belarusian",
    "bz": "English", "ca": "English", "cd": "French", "cf": "French", "cg": "French",
    "ch": "German", "ci": "French", "cl": "Spanish", "cm": "French", "cn": "Chinese",
    "co": "Spanish", "cr": "Spanish", "cu": "Spanish", "cv": "Portuguese", "cw": "Dutch",
    "cy": "Greek", "cz": "Czech", "de": "German", "dj": "French", "dk": "Danish",
    "dm": "English", "do": "Spanish", "dz": "Arabic", "ec": "Spanish", "ee": "Estonian",
    "eg": "Arabic", "eh": "Arabic", "er": "Tigrinya", "es": "Spanish", "et": "Amharic",
    "fi": "Finnish", "fj": "English", "fm": "English", "fo": "Faroese", "fr": "French",
    "ga": "French", "gb": "English", "gd": "English", "ge": "Georgian", "gf": "French",
    "gh": "English", "gi": "English", "gl": "Greenlandic", "gm": "English", "gn": "French",
    "gp": "French", "gq": "Spanish", "gr": "Greek", "gt": "Spanish", "gu": "English",
    "gw": "Portuguese", "gy": "English", "hk": "Cantonese", "hn": "Spanish", "hr": "Croatian",
    "ht": "French", "hu": "Hungarian", "id": "Indonesian", "ie": "English", "il": "Hebrew",
    "in": "Hindi", "iq": "Arabic", "ir": "Persian", "is": "Icelandic", "it": "Italian",
    "jm": "English", "jo": "Arabic", "jp": "Japanese", "ke": "English", "kg": "Kyrgyz",
    "kh": "Khmer", "ki": "English", "km": "Arabic", "kn": "English", "kp": "Korean",
    "kr": "Korean", "kw": "Arabic", "ky": "English", "kz": "Kazakh", "la": "Lao",
    "lb": "Arabic", "lc": "English", "li": "German", "lk": "Sinhala", "lr": "English",
    "ls": "English", "lt": "Lithuanian", "lu": "Luxembourgish", "lv": "Latvian", "ly": "Arabic",
    "ma": "Arabic", "mc": "French", "md": "Romanian", "me": "Montenegrin", "mf": "French",
    "mg": "Malagasy", "mh": "English", "mk": "Macedonian", "ml": "French", "mm": "Burmese",
    "mn": "Mongolian", "mo": "Chinese", "mp": "English", "mq": "French", "mr": "Arabic",
    "ms": "English", "mt": "Maltese", "mu": "English", "mv": "Dhivehi", "mw": "English",
    "mx": "Spanish", "my": "Malay", "mz": "Portuguese", "na": "English", "nc": "French",
    "ne": "French", "ng": "English", "ni": "Spanish", "nl": "Dutch", "no": "Norwegian",
    "np": "Nepali", "nr": "English", "nz": "English", "om": "Arabic", "pa": "Spanish",
    "pe": "Spanish", "pf": "French", "pg": "English", "ph": "Filipino", "pk": "Urdu",
    "pl": "Polish", "pm": "French", "pr": "Spanish", "ps": "Arabic", "pt": "Portuguese",
    "pw": "English", "py": "Spanish", "qa": "Arabic", "re": "French", "ro": "Romanian",
    "rs": "Serbian", "ru": "Russian", "rw": "Kinyarwanda", "sa": "Arabic", "sb": "English",
    "sc": "French", "sd": "Arabic", "se": "Swedish", "sg": "English", "si": "Slovenian",
    "sk": "Slovak", "sl": "English", "sm": "Italian", "sn": "French", "so": "Somali",
    "sr": "Dutch", "ss": "English", "st": "Portuguese", "sv": "Spanish", "sx": "Dutch",
    "sy": "Arabic", "sz": "English", "tc": "English", "td": "French", "tg": "French",
    "th": "Thai", "tj": "Tajik", "tl": "Portuguese", "tm": "Turkmen", "tn": "Arabic",
    "to": "Tongan", "tr": "Turkish", "tt": "English", "tv": "English", "tw": "Chinese",
    "tz": "Swahili", "ua": "Ukrainian", "ug": "English", "uk": "English", "us": "English",
    "uy": "Spanish", "uz": "Uzbek", "va": "Italian", "vc": "English", "ve": "Spanish",
    "vg": "English", "vi": "English", "vn": "Vietnamese", "vu": "Bislama", "ws": "Samoan",
    "ye": "Arabic", "yt": "French", "za": "English", "zm": "English", "zw": "English"
}

COMPANY_MAP = {
    "samsung": "Samsung TV Plus",
    "pluto": "Pluto TV (Paramount Global)",
    "bbc": "British Broadcasting Corporation (BBC)",
    "stingray": "Stingray Group Inc.",
    "rakuten": "Rakuten TV Europe",
    "distro": "DistroScale / DistroTV",
    "tubi": "Tubi TV (Fox Corporation)",
    "roku": "The Roku Channel (Roku Inc.)",
    "sofast": "SOFAST FAST Networks",
    "cineversetv": "Cineverse Entertainment",
    "xumo": "Xumo Play (Comcast & Charter)",
    "cbsn": "CBS News Digital (Paramount)",
    "abcnews": "ABC News Digital (Disney)",
    "cctv": "China Central Television (CCTV)",
    "cgtn": "China Global Television Network (CGTN)",
    "doordarshan": "Prasar Bharati (Doordarshan)",
    "antik": "Antik Telecom s.r.o.",
    "bfm": "Altice Média (BFM TV)",
    "amagi": "Amagi Media Cloud",
    "smotrim": "VGTRK (All-Russia State Television)",
    "multimedios": "Grupo Multimedios",
    "persiana": "Persiana Media Group",
    "skygo": "Sky Media",
    "telewebion": "Telewebion Media",
    "comclark": "ComClark Network",
    "denstv": "DensTV Indonesia",
    "tango": "Tango TV India",
    "pishow": "PiShow Entertainment",
    "onetv": "One TV Media",
    "smashplus": "Smash Plus Malta",
    "multimedios": "Multimedios Televisión"
}

def extract_city(name, tvg_id, source):
    """Extract city or municipality information from channel title, tvg_id, or source."""
    combined = f"{name} {tvg_id} {source}".lower()
    
    cities = [
        ("new york", "New York, NY"),
        ("los angeles", "Los Angeles, CA"),
        ("chicago", "Chicago, IL"),
        ("houston", "Houston, TX"),
        ("dallas", "Dallas, TX"),
        ("atlanta", "Atlanta, GA"),
        ("miami", "Miami, FL"),
        ("honolulu", "Honolulu, HI"),
        ("hawaii", "Hawaii"),
        ("nashua", "Nashua, NH"),
        ("framingham", "Framingham, MA"),
        ("athens", "Athens, GA"),
        ("london", "London"),
        ("manchester", "Manchester"),
        ("edinburgh", "Edinburgh"),
        ("toronto", "Toronto, ON"),
        ("montreal", "Montreal, QC"),
        ("vancouver", "Vancouver, BC"),
        ("paris", "Paris"),
        ("lyon", "Lyon"),
        ("marseille", "Marseille"),
        ("berlin", "Berlin"),
        ("munich", "Munich"),
        ("hamburg", "Hamburg"),
        ("rome", "Rome"),
        ("milan", "Milan"),
        ("madrid", "Madrid"),
        ("barcelona", "Barcelona"),
        ("tokyo", "Tokyo"),
        ("osaka", "Osaka"),
        ("seoul", "Seoul"),
        ("beijing", "Beijing"),
        ("shanghai", "Shanghai"),
        ("hong kong", "Hong Kong"),
        ("sydney", "Sydney"),
        ("melbourne", "Melbourne"),
        ("mumbai", "Mumbai"),
        ("delhi", "New Delhi"),
        ("sao paulo", "São Paulo"),
        ("rio", "Rio de Janeiro"),
        ("buenos aires", "Buenos Aires"),
        ("mexico city", "Mexico City"),
        ("dubai", "Dubai")
    ]
    
    for needle, city_name in cities:
        if needle in combined:
            return city_name
            
    return None

def extract_resolution(name):
    """Extract resolution tag from name."""
    m = re.search(r'\((\d+p|4K|UHD|HD|SD)\)', name, re.IGNORECASE)
    if m:
        val = m.group(1).upper()
        if '4K' in val or 'UHD' in val:
            return "3840x2160 (4K UHD)"
        if '1080' in val:
            return "1920x1080 (1080p FHD)"
        if '720' in val:
            return "1280x720 (720p HD)"
        if '540' in val:
            return "960x540 (540p)"
        if '480' in val:
            return "854x480 (480p SD)"
        return val
    return "1920x1080 (HD/FHD)"

def categorize_channel(name, group):
    combined = f"{name} {group}".lower()
    if any(w in combined for w in ["news", "weather", "noticias", "actu", "info", "journal"]):
        return "News & Weather"
    if any(w in combined for w in ["sport", "deporte", "fut", "soccer", "racing", "nfl", "nba"]):
        return "Sports"
    if any(w in combined for w in ["movie", "cinema", "film", "pelicula", "hollywood"]):
        return "Movies & Cinema"
    if any(w in combined for w in ["sci", "tech", "space", "future", "nasa", "cyber"]):
        return "Sci-Fi & Tech"
    if any(w in combined for w in ["nature", "wild", "animal", "earth", "planet", "ocean"]):
        return "Nature & Wildlife"
    if any(w in combined for w in ["doc", "history", "war", "discovery", "investig"]):
        return "Documentaries"
    if any(w in combined for w in ["music", "rock", "pop", "jazz", "hits", "vevo", "radio", "song"]):
        return "Music & Audio"
    if any(w in combined for w in ["kid", "child", "cartoon", "anime", "baby", "disney", "toon"]):
        return "Animation & Kids"
    if any(w in combined for w in ["food", "cook", "travel", "home", "garden", "style", "living"]):
        return "Lifestyle & Food"
    if any(w in combined for w in ["comedy", "humor", "laugh", "funny"]):
        return "Comedy"
    return "General & Entertainment"

def main():
    print("=== Scanning All 323 M3U Files for Complete Channel Inventory ===")
    m3u_files = glob.glob(os.path.join(STREAMS_DIR, "*.m3u"))
    print(f"Found {len(m3u_files)} M3U playlists in {STREAMS_DIR}")

    all_channels = []
    seen_urls = set()
    global_index = 1

    for filepath in m3u_files:
        basename = os.path.basename(filepath)
        filename_no_ext = basename.replace(".m3u", "")
        
        # Determine country code and company from filename
        country_code = "us"
        company_tag = None
        
        if "_" in filename_no_ext:
            parts = filename_no_ext.split("_", 1)
            country_code = parts[0].lower()
            company_tag = parts[1].lower()
        else:
            country_code = filename_no_ext.lower()
            
        c_info = COUNTRY_MAP.get(country_code, {
            "name": country_code.upper(),
            "flag": "🌐",
            "continent": "Global"
        })
        
        comp_name = COMPANY_MAP.get(company_tag, company_tag.capitalize() if company_tag else None)
        
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            continue

        lines = content.splitlines()
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if line.startswith("#EXTINF"):
                # Parse EXTINF
                tvg_id_match = re.search(r'tvg-id="([^"]*)"', line)
                tvg_logo_match = re.search(r'tvg-logo="([^"]*)"', line)
                group_match = re.search(r'group-title="([^"]*)"', line)
                
                parts = line.split(',')
                raw_name = parts[-1].strip() if len(parts) > 1 else "Unknown Channel"
                
                # Extract clean name
                clean_name = re.sub(r'\s*\([0-9]+p.*?\)', '', raw_name).strip()
                clean_name = re.sub(r'\s*\[.*?\]', '', clean_name).strip()
                
                # Next URL line
                i += 1
                while i < len(lines) and (not lines[i].strip() or lines[i].startswith('#')):
                    i += 1
                    
                if i < len(lines):
                    url = lines[i].strip()
                    if url.startswith("http") and url not in seen_urls:
                        seen_urls.add(url)
                        
                        tvg_id = tvg_id_match.group(1) if tvg_id_match else ""
                        logo = tvg_logo_match.group(1) if tvg_logo_match else ""
                        group = group_match.group(1) if group_match else ""
                        
                        city = extract_city(raw_name, tvg_id, basename)
                        res = extract_resolution(raw_name)
                        category = categorize_channel(raw_name, group)
                        
                        # Company fallback from domain or name
                        resp_company = comp_name
                        if not resp_company:
                            if "cloudfront" in url:
                                resp_company = "Amazon CloudFront Broadcast CDN"
                            elif "amagi" in url:
                                resp_company = "Amagi Cloud"
                            elif "wurl" in url:
                                resp_company = "Wurl FAST Network"
                            elif "akamai" in url:
                                resp_company = "Akamai Media"
                            else:
                                resp_company = f"{c_info['name']} Broadcaster"
                                
                        ch_obj = {
                            "channelId": f"ch-{global_index:05d}",
                            "channelNumber": global_index,
                            "name": clean_name or raw_name,
                            "rawName": raw_name,
                            "callsign": (tvg_id.split('.')[0] if '.' in tvg_id else clean_name[:8]).upper().replace(' ', '-'),
                            "category": category,
                            "country": {
                                "code": country_code.upper(),
                                "name": c_info["name"],
                                "flag": c_info["flag"],
                                "continent": c_info["continent"]
                            },
                            "city": city,
                            "responsibleCompany": resp_company,
                            "language": COUNTRY_LANGUAGE_MAP.get(country_code, "English"),
                            "formatInformation": {
                                "streamUrl": url,
                                "protocol": "HLS / m3u8",
                                "aspectRatio": "16:9",
                                "resolutionHint": res,
                                "videoCodec": "H.264 / AVC" if "HEVC" not in raw_name else "H.265 / HEVC",
                                "audioCodec": "AAC-LC Stereo",
                                "estimatedBitrateKbps": 4500 if "1080" in res or "4K" in res else (2500 if "720" in res else 1200)
                            },
                            "sourcePlaylist": basename,
                            "tvgId": tvg_id,
                            "logoUrl": logo
                        }
                        
                        all_channels.append(ch_obj)
                        global_index += 1
            i += 1

    print(f"Total Unique Channels Cataloged: {len(all_channels)}")

    master_payload = {
        "metadata": {
            "title": "Complete Global IPTV Channels Directory & Format Specification",
            "version": "2.4.0",
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "totalChannels": len(all_channels),
            "totalCountries": len(set(c["country"]["code"] for c in all_channels)),
            "continents": sorted(list(set(c["country"]["continent"] for c in all_channels))),
            "aspectRatioStandard": "16:9 Rectangular Monitor Fitting",
            "dvrCapable": True,
            "dvrFilenameFormat": "DVR_{timestamp}_CH{channelNumber}_{brandName}.webm"
        },
        "channels": all_channels
    }

    print(f"Writing master channel database to {OUTPUT_ROOT}...")
    with open(OUTPUT_ROOT, "w", encoding="utf-8") as f:
        json.dump(master_payload, f, indent=2)

    print(f"Writing web public copy to {OUTPUT_PUBLIC}...")
    with open(OUTPUT_PUBLIC, "w", encoding="utf-8") as f:
        json.dump(master_payload, f, indent=2)

    print("Complete channel database generated successfully!")

if __name__ == "__main__":
    main()
