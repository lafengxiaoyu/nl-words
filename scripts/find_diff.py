#!/usr/bin/env python3
import json
import os
import sys

# Change to the data directory
os.chdir('/Users/mac/IdeaProjects/nl-words/web/src/data')

# Read all lesson IDs
lesson_ids = set()
for root, dirs, files in os.walk('vocabulary'):
    for file in files:
        if file.startswith('lesson-') and file.endswith('.json'):
            path = os.path.join(root, file)
            try:
                with open(path) as f:
                    data = json.load(f)
                    for word in data.get('words', []):
                        lesson_ids.add(word['id'])
            except Exception as e:
                print(f"Error reading {path}: {e}", file=sys.stderr)

# Read words.json
with open('words.json') as f:
    words = json.load(f)
words_ids = set(w['id'] for w in words)

print(f"Lesson IDs: {len(lesson_ids)}")
print(f"Words IDs: {len(words_ids)}")
print(f"Difference: {len(words_ids - lesson_ids)}")

# Find extra IDs in words.json
extra_ids = sorted(words_ids - lesson_ids)
print(f"\nExtra IDs in words.json ({len(extra_ids)}):")
for id in extra_ids:
    word = next(w for w in words if w['id'] == id)
    print(f"  {id}: {word['word']}")

# Find missing IDs
missing_ids = sorted(lesson_ids - words_ids)
print(f"\nMissing IDs in words.json ({len(missing_ids)}):")
if len(missing_ids) <= 20:
    print(missing_ids)
else:
    print(f"{missing_ids[:20]}... (showing first 20)")
