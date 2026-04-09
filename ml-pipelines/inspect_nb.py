import json, sys

for fname in ['02_social_media_referrals.ipynb', '03_best_posting_times.ipynb']:
    print(f"\n=== {fname} ===")
    nb = json.load(open(fname, encoding='utf-8'))
    for i, c in enumerate(nb['cells']):
        src = c['source']
        first = src[0][:100] if src else ''
        print(f"  Cell {i} [{c['cell_type']}]: {repr(first)}")
