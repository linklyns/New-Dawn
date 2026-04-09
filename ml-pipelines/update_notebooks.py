"""Update pipeline notebook cells to reflect new lookup table designs."""
import json

# ─── Helpers ──────────────────────────────────────────────────────────────

def set_cell_source(nb, idx, new_source):
    """Replace cell source (list of strings or a single string)."""
    if isinstance(new_source, str):
        # Split by lines but keep the newlines
        lines = new_source.splitlines(keepends=True)
        new_source = lines
    nb['cells'][idx]['source'] = new_source
    # Clear outputs for code cells so they re-run clean
    if nb['cells'][idx]['cell_type'] == 'code':
        nb['cells'][idx]['outputs'] = []
        nb['cells'][idx]['execution_count'] = None


# ─── Pipeline 02 ──────────────────────────────────────────────────────────

with open('02_social_media_referrals.ipynb', encoding='utf-8') as f:
    nb02 = json.load(f)

# Cell 1 — Business Understanding
set_cell_source(nb02, 1, """\
## 1. Business Understanding & Problem Definition

New Dawn's social media team publishes posts across Instagram, Facebook, TikTok, LinkedIn, Twitter, and WhatsApp. Each post has controllable features (platform, media type, CTA type, content topic, boost budget, etc.) and measurable outcomes.

### Goal
Build **6 regression models** that predict post-level outcomes from controllable features:
1. `donation_referrals` — Number of donations attributed to this post
2. `estimated_donation_value_php` — Estimated total Philippine pesos (PHP) value of donations referred by this post
3. `forwards` — Number of message forwards (WhatsApp personal referrals with high donation conversion rates)
4. `profile_visits` — Number of profile visits attributed to this post
5. `engagement_rate` — Engagement rate: (likes + comments + shares) / reach
6. `impressions` — Total number of times the post was displayed

The predictions power the **Social Media Editor** page's real-time prediction cards, updating as the author changes post attributes.

### Lookup Table Design
Pre-compute predictions for all realistic feature combinations. The lookup key now includes **10 categorical dimensions**:

| Dimension | Role |
|---|---|
| platform | Core identity |
| post_type | Core identity |
| media_type | Core identity |
| content_topic | Core identity |
| sentiment_tone | Core identity |
| has_call_to_action | Derived from CTA type |
| call_to_action_type | Core identity |
| features_resident_story | Content flag |
| is_boosted | Paid promotion flag |
| **boost_budget_php_bin** | **New — bins raw budget into: none / low / medium / high** |
| day_of_week | Time dimension |

### Success Criteria
- Positive R² on cross-validation for all 6 targets
- Reasonable RMSE relative to target standard deviation
- Lookup table ≤ 50,000 rows for fast API lookups
""")

# Cell 6 — Data Preparation
set_cell_source(nb02, 6, """\
## 3. Data Preparation & Feature Engineering

We use the pipeline module's preparation functions:
- Boolean columns (`has_call_to_action`, `features_resident_story`, `is_boosted`) → 'Yes'/'No' strings
- Categorical features → one-hot encoded for model training
- `boost_budget_php` → continuous numeric for training; **also binned** into `boost_budget_php_bin` (none / low / medium / high) as a lookup dimension
- Numeric features for training: `caption_length`, `num_hashtags`, `mentions_count`, `boost_budget_php`, `post_hour`
- Lookup table numeric cross-product: `caption_length`, `num_hashtags`, `mentions_count`, `post_hour` (boost replaced by bin)
""")

# Cell 16 — Lookup Table Generation (markdown)
set_cell_source(nb02, 16, """\
## 7. Lookup Table Generation

Pre-compute predictions for all realistic feature combinations and save as `social_post_predictions.csv`.

### Lookup key dimensions (10 categoricals + day_of_week)
- `platform`, `post_type`, `media_type`, `content_topic`, `sentiment_tone`
- `has_call_to_action`, `call_to_action_type`, `features_resident_story`, `is_boosted`
- **`boost_budget_php_bin`** (none / low / medium / high — Q1/Q3 quartile split of non-zero values)
- `day_of_week`

### Numeric cross-product dimensions
`caption_length`, `num_hashtags`, `mentions_count`, `post_hour` at 25th / 50th / 75th percentile values

`boost_budget_php_bin` is mapped back to its per-bin median PHP value when feeding the trained model, so the continuous model still receives a plausible numeric input.

Capped at 50,000 rows for performance.
""")

# Cell 17 — code (run) — no content change needed, just clear outputs
set_cell_source(nb02, 17, """\
from pipelines.social_media_referrals import run

lookup_df, trained_models = run(posts)

print(f'\\nLookup table shape: {lookup_df.shape}')
print(f'\\nKey columns: {[c for c in lookup_df.columns if not c.startswith("predicted_")]}')
print(f'\\nPredicted columns:')
pred_cols = [c for c in lookup_df.columns if c.startswith('predicted_')]
lookup_df[pred_cols].describe().round(2)
""")

# Cell 18 — Deployment markdown
set_cell_source(nb02, 18, """\
## 8. Deployment — CSV Output & Web Integration (Ch. 15)

The lookup CSV is consumed by:
- **Backend**: `CsvPredictionService` loads it into memory. `POST /api/predictions/ml/social-lookup` filters by all 10 categorical dimensions using progressive relaxation (drops lower-priority filters until results are found). Returns the closest matching predictions.
- **Frontend**: The Social Media Editor sends debounced requests as the user changes post attributes. The 6 predicted values display as real-time prediction cards with descriptions.

New fields now filtered from the request: `hasCallToAction`, `featuresResidentStory`, `isBosted`, `boostBudgetPhp` (server converts raw PHP to bin).

**Nightly refresh**: `run_all_pipelines.py` regenerates the lookup table at 2:00 AM.
""")

# Cell 19 — sample output
set_cell_source(nb02, 19, """\
# Sample of the final output
pred_cols = [c for c in lookup_df.columns if c.startswith('predicted_')]
display_cols = ['platform', 'post_type', 'media_type', 'content_topic',
                'boost_budget_php_bin', 'day_of_week'] + pred_cols
lookup_df[display_cols].head(10)
""")

with open('02_social_media_referrals.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb02, f, indent=1, ensure_ascii=False)
print("Updated 02_social_media_referrals.ipynb")


# ─── Pipeline 03 ──────────────────────────────────────────────────────────

with open('03_best_posting_times.ipynb', encoding='utf-8') as f:
    nb03 = json.load(f)

# Cell 1 — Business Understanding
set_cell_source(nb03, 1, """\
## 1. Business Understanding & Problem Definition

The social media team at New Dawn wants to know **when to post** to maximize donation volume, but the best time depends heavily on *what* they're posting — a boosted fundraising reel on Instagram has a very different peak window than an organic WhatsApp story forward.

### Goal
Train a regression model on `estimated_donation_value_php` using all post features including `day_of_week` and `post_hour`, then **predict the expected donation value for each of the 168 possible day/hour combinations per unique post-attribute combination**.

This produces a **conditioned lookup table** (replacing the old global 168-row ranking): the frontend sends the draft's post attributes and receives the **top 5 time slots** most likely to maximise donations for that specific post type.

### Lookup Table Design

| Conditioning dimension | Description |
|---|---|
| `platform` | Where the post will be published |
| `post_type` | FundraisingAppeal, StoryHighlight, etc. |
| `media_type` | Photo, Video, Reel, etc. |
| `content_topic` | Education, Reintegration, etc. |
| `sentiment_tone` | Hopeful, Urgent, Celebratory, etc. |
| `has_call_to_action` | Yes / No |
| `call_to_action_type` | DonateNow, LearnMore, etc. |
| `features_resident_story` | Whether the post features a resident story |
| `is_boosted` | Whether paid promotion is used |
| `boost_budget_php_bin` | none / low / medium / high |

For each unique observed combination, the output contains 5 rows (rank 1–5).

### Success Criteria
- Model captures meaningful time-of-day and day-of-week patterns
- Conditioned output: correct top-5 slots retrieved for any given draft configuration
""")

# Cell 6 — Data Preparation
set_cell_source(nb03, 6, """\
## 3. Data Preparation

Preparation mirrors Pipeline 2:
- Boolean columns → 'Yes'/'No' strings
- `boost_budget_php` binned into `boost_budget_php_bin` (none / low / medium / high) for conditioning
- Numeric features for model training: `post_hour`, `num_hashtags`, `mentions_count`, `caption_length`, `boost_budget_php`
""")

# Cell 15 — Time Slot Prediction (markdown)
set_cell_source(nb03, 15, """\
## 7. Conditioned Time Slot Prediction

For each unique combination of post-attribute conditioning dimensions observed in the historical data, we predict `estimated_donation_value_php` across all 168 day × hour slots.

- Numeric auxiliaries (`num_hashtags`, `mentions_count`, `caption_length`) held at global medians
- `boost_budget_php` mapped from its bin label → per-bin median PHP value for the model
- Each combination's 168 predictions are ranked; the top 5 are retained with `rank` 1–5

Output: long-format CSV with `N_combos × 5` rows.
""")

# Cell 16 — code: run conditioned predictions
set_cell_source(nb03, 16, """\
from pipelines.best_posting_times import generate_conditioned_time_predictions

time_output = generate_conditioned_time_predictions(best_model, df, feature_names)

n_combos = time_output.groupby(
    ['platform', 'post_type', 'media_type', 'content_topic', 'sentiment_tone',
     'has_call_to_action', 'call_to_action_type', 'features_resident_story',
     'is_boosted', 'boost_budget_php_bin']
).ngroups

print(f'Conditioned lookup: {len(time_output)} rows ({n_combos} combinations × 5 slots each)')
print(f'\\nColumns: {list(time_output.columns)}')
print(f'\\nSample (first combination top 5):')
time_output.head(5)[['platform', 'boost_budget_php_bin', 'rank', 'day_of_week',
                      'post_hour', 'predicted_estimated_donation_value_php',
                      'historical_post_count', 'confidence_indicator']]
""")

# Cell 17 — heatmap for a single representative combo
set_cell_source(nb03, 17, """\
import warnings
warnings.filterwarnings('ignore')

# Visualise the global best-time heatmap (using legacy mode/median baseline)
from pipelines.best_posting_times import generate_time_predictions

global_preds = generate_time_predictions(best_model, df, feature_names)

pivot_pred = global_preds.pivot_table(
    values='predicted_estimated_donation_value_php',
    index='day_of_week', columns='post_hour'
).reindex(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])

fig, ax = plt.subplots(figsize=(16, 5))
sns.heatmap(pivot_pred, cmap='YlOrRd', annot=True, fmt='.0f', ax=ax)
ax.set_title('Global Predicted Donation Value (PHP) by Day × Hour\\n(mode/median baseline — for visualisation only)')
ax.set_ylabel('Day of Week')
ax.set_xlabel('Post Hour')
plt.tight_layout()
plt.show()
""")

# Cell 18 — Deployment markdown
set_cell_source(nb03, 18, """\
## 8. Deployment — CSV Output & Web Integration (Ch. 15)

The output `best_posting_times.csv` is served by:
- **Backend**: `POST /api/predictions/ml/best-posting-times` accepts the same post-attribute body as the social-lookup endpoint. The service filters the conditioned CSV by those attributes (with progressive relaxation), returning the top 5 matching slots.
- **Frontend**: The Social Media Editor's Suggested Times bar displays the top 5 context-specific slots as clickable buttons. The best slot is auto-applied to the draft's scheduled day/hour.

Each slot shows the predicted PHP value and a confidence indicator (Low/Medium/High) based on historical post density at that day/hour.

**Nightly refresh**: `run_all_pipelines.py` regenerates the table at 2:00 AM.
""")

# Cell 19 — save output
set_cell_source(nb03, 19, """\
# Save the conditioned output
from functions import save_pipeline_output

save_pipeline_output(time_output, 'best_posting_times.csv')

print(f'\\nConfidence distribution across all combinations:')
print(time_output['confidence_indicator'].value_counts())
print(f'\\nPlatform distribution in lookup:')
print(time_output['platform'].value_counts())
""")

with open('03_best_posting_times.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb03, f, indent=1, ensure_ascii=False)
print("Updated 03_best_posting_times.ipynb")
print("Done.")
