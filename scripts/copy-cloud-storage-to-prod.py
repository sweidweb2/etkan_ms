#!/usr/bin/env python3
"""Copy Cloud Storage object bytes onto self-hosted prod. Uses env vars only."""

from __future__ import annotations

import mimetypes
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

MIME_BY_SUFFIX = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"missing {name}")
    return value.rstrip("/")


def encode_path(name: str) -> str:
    return "/".join(urllib.parse.quote(part, safe="") for part in name.split("/"))


def content_type_for(name: str) -> str:
    suffix = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
    guessed = MIME_BY_SUFFIX.get(suffix) or mimetypes.guess_type(name)[0]
    return guessed or "application/octet-stream"


def request(url: str, key: str, data: bytes | None = None, content_type: str | None = None) -> bytes:
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    method = "GET"
    if data is not None:
        method = "POST"
        headers["Content-Type"] = content_type or "application/octet-stream"
        headers["x-upsert"] = "true"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read()


def main() -> None:
    cloud_url = env("CLOUD_SUPABASE_URL")
    cloud_key = env("CLOUD_SERVICE_ROLE_KEY")
    prod_url = env("PROD_SUPABASE_URL")
    prod_key = env("PROD_SERVICE_ROLE_KEY")

    listing = subprocess.check_output(
        [
            "docker",
            "exec",
            "supabase_db_etkan_ms_prod",
            "psql",
            "-U",
            "postgres",
            "-A",
            "-t",
            "-F",
            "\t",
            "-c",
            "select bucket_id, name from storage.objects order by bucket_id, name;",
        ],
        text=True,
    )

    ok = 0
    failed = 0
    for raw in listing.splitlines():
        line = raw.strip()
        if not line:
            continue
        bucket, name = line.split("\t", 1)
        encoded = encode_path(name)
        label = f"{bucket}/{name}"
        try:
            body = request(f"{cloud_url}/storage/v1/object/{bucket}/{encoded}", cloud_key)
            request(
                f"{prod_url}/storage/v1/object/{bucket}/{encoded}",
                prod_key,
                data=body,
                content_type=content_type_for(name),
            )
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:200]
            print(f"FAIL {label} HTTP {error.code} {detail}", file=sys.stderr)
            failed += 1
            continue
        except Exception as error:
            print(f"FAIL {label} {error}", file=sys.stderr)
            failed += 1
            continue
        print(f"OK {label} ({len(body)} bytes)")
        ok += 1

    print(f"done ok={ok} fail={failed}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
