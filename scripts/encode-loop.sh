#!/bin/bash
# Encodes the opening film for the hero at 1080p and 720p, muted, up to the end card.
# The upright phone version is reframed shot by shot in scripts/encode-tall.mjs.
# Usage: bash scripts/encode-loop.sh <ffmpeg binary> "<hero film .mov>"
set -euo pipefail
FF="$1"; V="$2"; O="public/film"
X=(-an -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -g 48 -movflags +faststart)
"$FF" -hide_banner -loglevel error -y -t 40.75 -i "$V" \
  -filter_complex "[0:v]split=2[a][b];[a]scale=1920:1080:flags=lanczos[w1080];[b]scale=1280:720:flags=lanczos[w720]" \
  -map "[w1080]" "${X[@]}" -crf 25 -maxrate 4200k -bufsize 8400k "$O/loop-1080.mp4" \
  -map "[w720]" "${X[@]}" -crf 26 -maxrate 2000k -bufsize 4000k "$O/loop-720.mp4"
ls -la "$O"/loop-*.mp4
