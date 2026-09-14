#!/usr/bin/env bash
# Authenticates against a running dev server and checks every route renders.
set -u
BASE="${BASE:-http://localhost:3000}"
JAR=$(mktemp)
EMAIL="__smoke__@local.test"
PASS="smoke-password-123"
fail=0

check() { # path expected_status must_contain
  local path="$1" want="$2" needle="${3:-}"
  local body code
  body=$(curl -s -b "$JAR" -c "$JAR" -w "\n%{http_code}" "$BASE$path")
  code=$(tail -n1 <<<"$body")
  body=$(sed '$d' <<<"$body")

  if [ "$code" != "$want" ]; then
    echo "  ✗ $path — got HTTP $code, wanted $want"; fail=$((fail+1)); return
  fi
  if [ -n "$needle" ] && ! grep -qF "$needle" <<<"$body"; then
    echo "  ✗ $path — HTTP $code but missing \"$needle\""; fail=$((fail+1)); return
  fi
  echo "  ✓ $path"
}

# Content ids are assigned by the database, so resolve real ones rather than
# assuming 1 — they differ between a fresh install and an upgraded one.
READING_ID="${READING_ID:?set READING_ID}"
WORD_ID="${WORD_ID:?set WORD_ID}"
EXAM_ID="${EXAM_ID:?set EXAM_ID}"

echo "Public routes (no session)"
check /cheatsheet 200 "Grammar Cheat Sheet"
check /cheatsheet/A1 200 "Articles"
check /cheatsheet/B2 200 "Konjunktiv I"
check /login 200 "Sign in"

echo
echo "Signing in as the smoke-test user"
CSRF=$(curl -s -c "$JAR" -b "$JAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
curl -s -o /dev/null -b "$JAR" -c "$JAR" -X POST \
  -d "csrfToken=$CSRF&email=$EMAIL&password=$PASS" \
  "$BASE/api/auth/callback/credentials"

if curl -s -b "$JAR" "$BASE/api/auth/session" | grep -q "$EMAIL"; then
  echo "  ✓ session established"
else
  echo "  ✗ could not establish a session — aborting"; exit 1
fi

echo
echo "Authenticated routes"
check /dashboard 200 "Hallo"
check /flashcards 200 "Flashcards"
check /dictionary 200 "Dictionary"
check "/dictionary?q=isst" 200 "essen"
check "/dictionary?q=H%C3%A4user" 200 "Haus"
check "/dictionary?q=to+eat" 200 "essen"
check "/dictionary?pos=VERB&sub=verb-modal" 200 "Modal verbs"
check /lessons 200 "Lessons"
check /lessons/a1-present-tense 200 "Present Tense"
check /lessons/b1-konjunktiv2 200 "Konjunktiv II"
check /exercises 200 "Grammar Exercises"
check "/exercises?level=A2&tag=a2-perfekt" 200 "Perfekt"
check /daily 200 "Daily Challenge"
check /games 200 "Mini Games"
check /games/word-match 200 "Word Match"
check /games/gender-battle 200 "Gender Battle"
check /games/listening-quiz 200 "Listening Quiz"
check /games/fill-blank 200 "Fill in the Blank"
check /sentence-builder 200 "Sentence Builder"
check /reading 200 "Reading Mode"
check "/reading/$READING_ID" 200 "Tap any word"
check /pronunciation 200 "Pronunciation Guide"
check /exam 200 "Exam Prep"
check /exam/reading 200 "Reading tasks"
check /exam/listening 200 "Listening tasks"
check /exam/writing 200 "Writing tasks"
check /exam/speaking 200 "Speaking tasks"
check /exam/comprehension 200 "Comprehension tasks"
check /progress 200 "Progress"
check /insights 200 "Insights"
check /profile 200 "Where you are"

echo
echo "Word detail pages"
check "/dictionary/$WORD_ID" 200 "Present tense"
check "/exam/item/$EXAM_ID" 200 "Listen"

rm -f "$JAR"
echo
if [ "$fail" -eq 0 ]; then echo "All route checks passed."; else echo "$fail route check(s) FAILED."; fi
exit $fail
