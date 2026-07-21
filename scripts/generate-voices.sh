#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-voices.sh — produce the battle-voice MP3s via ElevenLabs TTS.
#
# The game (scripts/main.js "Battle Voices") plays these files from
# sounds/voices/. Every file is optional — the game silently skips missing
# ones — so run this once, commit the MP3s, and the voices go live.
#
# USAGE:
#   export ELEVEN_API_KEY=sk_...     # your ElevenLabs key (never commit it)
#   ./scripts/generate-voices.sh
#
# OPTIONAL:
#   UA_VOICE_ID  voice for the player's Ukrainian battle cries
#                (default: Adam pNInz6obpgDQGcFmaJgB — swap for any energetic
#                 male voice in your account)
#   RU_VOICE_ID  voice for enemy Russian shouts
#                (default: Arnold VR6AewLTigWG4xSOukaG — rough/deep)
#
# Player cries trigger on heavy-weapon shots (Stugna/NLAW/Panzerfaust/Matador/
# GL/drone-bomb/tank); enemy shouts trigger as zombies spawn. Includes the
# authentic Snake Island phrase in its original wording.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
[ -n "${ELEVEN_API_KEY:-}" ] || { echo "ERROR: export ELEVEN_API_KEY=sk_... first"; exit 1; }
UA_VOICE_ID="${UA_VOICE_ID:-pNInz6obpgDQGcFmaJgB}"
RU_VOICE_ID="${RU_VOICE_ID:-VR6AewLTigWG4xSOukaG}"
MODEL="eleven_multilingual_v2"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/sounds/voices"
mkdir -p "$OUT"

tts() { # tts <voice_id> <file_id> <text>
  local vid="$1" fid="$2" text="$3"
  echo "▶ $fid  ($text)"
  curl -sS -X POST "https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128" \
    -H "xi-api-key: ${ELEVEN_API_KEY}" -H "Content-Type: application/json" -H "Accept: audio/mpeg" \
    -d "{\"text\":\"${text}\",\"model_id\":\"${MODEL}\",\"voice_settings\":{\"stability\":0.30,\"similarity_boost\":0.75,\"style\":0.65,\"use_speaker_boost\":true}}" \
    -o "$OUT/${fid}.mp3"
  if head -c 1 "$OUT/${fid}.mp3" | grep -q '{'; then echo "  ✖ ElevenLabs error:"; cat "$OUT/${fid}.mp3"; rm -f "$OUT/${fid}.mp3"; exit 1; fi
}

# ── Player: Ukrainian battle cries (energetic, shouted) ──
tts "$UA_VOICE_ID" ua_slava      "Слава Україні!"
tts "$UA_VOICE_ID" ua_heroyam    "Героям слава!"
tts "$UA_VOICE_ID" ua_warship    "Русский военный корабль, иди нахуй!"
tts "$UA_VOICE_ID" ua_putin      "Путін — хуйло!"
tts "$UA_VOICE_ID" ua_za_ukrainu "За Україну! Вогонь!"
tts "$UA_VOICE_ID" ua_smert      "Смерть ворогам!"
tts "$UA_VOICE_ID" ua_okupant    "Іди нахуй, окупанте!"
tts "$UA_VOICE_ID" ua_trymai     "Тримай, сволото!"

# ── Enemy: Russian combat shouts (rough, barked) ──
tts "$RU_VOICE_ID" ru_vpered     "Вперёд! Вперёд!"
tts "$RU_VOICE_ID" ru_v_ataku    "В атаку!"
tts "$RU_VOICE_ID" ru_ogon       "Огонь! Огонь!"
tts "$RU_VOICE_ID" ru_okruzhay   "Окружай его!"
tts "$RU_VOICE_ID" ru_otstupaem  "Отступаем! Назад!"
tts "$RU_VOICE_ID" ru_za_rodinu  "За родину!"

echo ""
echo "✅ $(ls "$OUT" | wc -l | tr -d ' ') voice files in sounds/voices/ — commit them and the game picks them up automatically."
