import os
import re
import json

def parse_m3u(file_path):
    channels = []
    if not os.path.exists(file_path):
        return channels
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('#EXTINF:'):
            # Parse EXTINF
            tvg_id_match = re.search(r'tvg-id="([^"]*)"', line)
            tvg_logo_match = re.search(r'tvg-logo="([^"]*)"', line)
            group_title_match = re.search(r'group-title="([^"]*)"', line)
            
            # channel name is after the last comma
            parts = line.split(',')
            name = parts[-1].strip() if len(parts) > 1 else "Unknown Channel"
            
            # next non-empty line should be URL
            i += 1
            while i < len(lines) and (not lines[i].strip() or lines[i].startswith('#')):
                i += 1
            if i < len(lines):
                url = lines[i].strip()
                if url.startswith('http'):
                    channels.append({
                        'name': name,
                        'tvg_id': tvg_id_match.group(1) if tvg_id_match else '',
                        'logo': tvg_logo_match.group(1) if tvg_logo_match else '',
                        'group': group_title_match.group(1) if group_title_match else '',
                        'url': url,
                        'source_file': os.path.basename(file_path)
                    })
        i += 1
    return channels

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
playlists = [
    os.path.join(BASE_DIR, 'iptv', 'streams', 'us_samsung.m3u'),
    os.path.join(BASE_DIR, 'iptv', 'streams', 'us.m3u'),
    os.path.join(BASE_DIR, 'iptv', 'streams', 'us_pluto.m3u'),
    os.path.join(BASE_DIR, 'iptv', 'streams', 'uk.m3u'),
    os.path.join(BASE_DIR, 'iptv', 'streams', 'ca_stingray.m3u')
]

all_channels = []
for p in playlists:
    chs = parse_m3u(p)
    all_channels.extend(chs)
    print(f"Loaded {len(chs)} channels from {os.path.basename(p)}")

print(f"Total channels parsed: {len(all_channels)}")

# Let's inspect some interesting cloudfront or direct m3u8 channels
interesting = []
for c in all_channels:
    if 'Geo-blocked' not in c['name'] and 'Not 24/7' not in c['name']:
        interesting.append(c)

print(f"Total non-geoblocked: {len(interesting)}")
with open(os.path.join(BASE_DIR, 'parsed_channels_sample.json'), 'w', encoding='utf-8') as f:
    json.dump(interesting[:50], f, indent=2)

print("Saved sample 50 channels to parsed_channels_sample.json")
