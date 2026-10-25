#!/usr/bin/env python3
"""
CLI DVR Stream Recorder Utility
Records live IPTV streams directly using ffmpeg and names files according to:
DVR_{timestamp}_CH{channelNumber}_{brandName}.mp4
"""

import os
import sys
import argparse
import subprocess
import time
import shutil

FFMPEG_PATH = shutil.which("ffmpeg") or r"C:\ffmpeg\bin\ffmpeg.exe"

def record_stream(url, channel_number, brand_name, duration_sec, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    now = time.strftime("%Y-%m-%d_%H-%M-%S", time.localtime())
    clean_brand = re.sub(r'[^a-zA-Z0-9_\-\s]', '', brand_name).strip().replace(' ', '_')[:32]
    filename = f"DVR_{now}_CH{channel_number}_{clean_brand}.mp4"
    out_path = os.path.join(output_dir, filename)

    print(f"=== Starting DVR Recording ===")
    print(f"Channel: CH {channel_number} - {brand_name}")
    print(f"Stream URL: {url}")
    print(f"Duration: {duration_sec} seconds")
    print(f"Output File: {out_path}")

    cmd = [
        FFMPEG_PATH,
        "-y",
        "-i", url,
        "-t", str(duration_sec),
        "-c", "copy",
        "-bsf:a", "aac_adtstoasc",
        out_path
    ]

    try:
        proc = subprocess.run(cmd)
        if proc.returncode == 0 and os.path.exists(out_path):
            size_mb = os.path.getsize(out_path) / (1024 * 1024)
            print(f"[DONE] Recording completed successfully! ({size_mb:.2f} MB)")
            print(f"File saved to: {out_path}")
            return out_path
        else:
            print("[ERROR] FFmpeg recording exited with non-zero status.")
    except Exception as e:
        print(f"[ERROR] Recording exception: {e}")
    return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IPTV Stream DVR Recorder")
    parser.add_argument("--url", required=True, help="Stream m3u8 URL")
    parser.add_argument("--channel", default="101", help="Channel number")
    parser.add_argument("--brand", default="IPTV", help="Brand or channel name")
    parser.add_argument("--duration", type=int, default=15, help="Recording duration in seconds")
    parser.add_argument("--outdir", default="./recordings", help="Output directory")

    args = parser.parse_args()
    record_stream(args.url, args.channel, args.brand, args.duration, args.outdir)
