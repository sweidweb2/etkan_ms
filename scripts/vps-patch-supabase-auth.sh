#!/usr/bin/env bash
# Point CLI Auth emails at staging. Safe to re-run after git checkout -f.
set -euo pipefail

ROOT="${ETKAN_ROOT:-$HOME/etkan_ms}"
FILE="$ROOT/supabase/config.toml"

if [[ ! -f "$FILE" ]]; then
  echo "Missing $FILE" >&2
  exit 1
fi

python3 - "$FILE" << 'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
old = 'site_url = "http://127.0.0.1:3000"'
new = 'site_url = "https://staging.etkan.org"'
if old in text:
    text = text.replace(old, new, 1)
elif 'site_url = "https://staging.etkan.org"' in text:
    pass
else:
    raise SystemExit("Could not find site_url line to patch")
path.write_text(text)
print("patched Auth site_url -> https://staging.etkan.org")
PY
