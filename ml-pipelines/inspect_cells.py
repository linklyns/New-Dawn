import json, sys

# Read and print specific cells
for fname, cells in [
    ('02_social_media_referrals.ipynb', [1, 6, 16, 17, 18, 19]),
    ('03_best_posting_times.ipynb', [1, 6, 15, 16, 17, 18, 19]),
]:
    print(f"\n=== {fname} ===")
    nb = json.load(open(fname, encoding='utf-8'))
    for i in cells:
        c = nb['cells'][i]
        print(f"\n--- Cell {i} [{c['cell_type']}] ---")
        print(''.join(c['source']))
