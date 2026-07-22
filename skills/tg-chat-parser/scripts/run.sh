#!/bin/bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path_to_raw_chat_dir>"
    echo "Example: $0 /root/.openclaw/workspace/obsidian_vault/raw/chats/chat_002"
    exit 1
fi

CHAT_DIR="$(realpath "$1")"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Telegram Chat Parser (Conversion Only) ==="
echo "Target: $CHAT_DIR"

# 1. Запуск парсера HTML -> TXT (с резкой по 4000 строк)
echo "Converting HTML to TXT and splitting into chunks..."
node "$SKILL_DIR/scripts/html_to_txt.js" "$CHAT_DIR"

echo "=== Conversion Complete! ==="
echo "Files generated in: $CHAT_DIR"
ls -lh "$CHAT_DIR"/parsed_chat_*.txt
echo "Next Step: Ask the OpenClaw agent (me) to analyze this parsed file directly and generate wiki/chats/<chat_name>/chatsInfo.md."
