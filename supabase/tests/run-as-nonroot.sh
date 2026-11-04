#!/usr/bin/env bash
# initdb refuses to run as root; this wrapper runs run-local.sh as the postgres user (CI containers).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"; cp -r "$here" "$tmp/supabase"; chown -R postgres "$tmp"
su postgres -s /bin/bash -c "cd /tmp && $tmp/supabase/tests/run-local.sh"; rc=$?; rm -rf "$tmp"; exit $rc
