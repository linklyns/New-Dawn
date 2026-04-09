"""
Generate ~2500 synthetic social media post rows with realistic day/time/platform
performance patterns. Appends to lighthouse_csv_v7/social_media_posts.csv and
seeds the rows directly into Supabase.
"""

import os, sys, random, math
import pandas as pd
import numpy as np
import psycopg2
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE, "lighthouse_csv_v7", "social_media_posts.csv")
CONN_STR = (
    "host=aws-1-us-west-2.pooler.supabase.com "
    "port=5432 "
    "dbname=postgres "
    "user=postgres.otluyiykkmsnacuubczm "
    "password=7Hu6EWkXf?JQp@m "
    "sslmode=require"
)

# ---------------------------------------------------------------------------
# Categorical pools
# ---------------------------------------------------------------------------
PLATFORMS = ["Facebook", "Instagram", "WhatsApp", "Twitter", "TikTok", "LinkedIn", "YouTube"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
POST_TYPES = ["FundraisingAppeal", "ImpactStory", "Campaign", "ThankYou", "EducationalContent", "EventPromotion"]
MEDIA_TYPES = {
    "Facebook":   ["Photo", "Video", "Text", "Link"],
    "Instagram":  ["Photo", "Video", "Reel", "Carousel"],
    "WhatsApp":   ["Text", "Photo", "Video"],
    "Twitter":    ["Text", "Photo", "Link"],
    "TikTok":     ["Video", "Reel"],
    "LinkedIn":   ["Text", "Photo", "Link", "Video"],
    "YouTube":    ["Video"],
}
CONTENT_TOPICS = ["Education", "SafehouseLife", "DonorImpact", "Health", "Gratitude",
                  "AwarenessRaising", "Reintegration", "CampaignLaunch", "EventRecap"]
SENTIMENT_TONES = ["Emotional", "Hopeful", "Urgent", "Grateful", "Celebratory",
                   "Inspirational", "Informative"]
CTA_TYPES = ["Donate", "LearnMore", "Share", "FollowUs", "SignUp", None]
HASHTAG_BANKS = [
    "#SurvivorStrong #BeTheChange #HopeForGirls",
    "#LighthousePH #ProtectChildren #HumanTrafficking",
    "#GiveHope #ChildRights #EndTrafficking",
    "#BeTheLight #SupportSurvivors #SafeHouse",
    "#TogetherWeRise #GirlsAreStrong #DonateNow",
]
CAPTION_TEMPLATES = [
    "Every peso you give builds a safer tomorrow. Help us keep our doors open.",
    "These girls are proof that healing is possible. Support their journey.",
    "We've seen miracles happen with your generosity. Be part of the next one.",
    "One donation. One changed life. Will you be the change today?",
    "Our girls are thriving because of people like you. Thank you.",
    "Help us give more girls the safety and love they deserve.",
    "Each story of healing starts with your support. Give today.",
    "The road to recovery is long, but together we walk it.",
    "Your donation is not just money — it's hope, safety, and a future.",
    "We are Lighthouse. We shine brightest when you give.",
]

# ---------------------------------------------------------------------------
# Platform followers (realistic base with growth 2023-2026)
# ---------------------------------------------------------------------------
FOLLOWER_BASE = {
    "Facebook": 8500, "Instagram": 5200, "WhatsApp": 1800,
    "Twitter": 2900, "TikTok": 12000, "LinkedIn": 3100, "YouTube": 6400
}

# ---------------------------------------------------------------------------
# Engagement & donation value patterns
# ---------------------------------------------------------------------------

def _time_mult(day: str, hour: int) -> float:
    """Return a multiplier (0.1 – 2.8) for (day, hour) based on realistic patterns."""
    peak_windows = {
        "Monday":    [(8, 10, 2.0), (12, 14, 1.5), (19, 21, 1.7)],
        "Tuesday":   [(8, 10, 1.9), (12, 14, 1.6), (19, 21, 1.8), (21, 23, 1.4)],
        "Wednesday": [(9, 12, 1.8), (14, 16, 1.4), (19, 22, 2.2)],
        "Thursday":  [(8, 10, 1.7), (12, 14, 1.5), (18, 21, 2.4), (21, 23, 1.6)],
        "Friday":    [(9, 11, 1.6), (12, 15, 2.0), (18, 21, 2.6), (21, 23, 1.5)],
        "Saturday":  [(8, 12, 2.3), (14, 17, 1.8), (19, 22, 2.1)],
        "Sunday":    [(10, 13, 1.9), (15, 18, 2.0), (19, 21, 1.7)],
    }
    for start, end, mult in peak_windows.get(day, []):
        if start <= hour < end:
            return mult
    if 0 <= hour < 5:
        return 0.05
    if 5 <= hour < 7:
        return 0.35
    if 7 <= hour < 8:
        return 0.8
    return 0.9  # off-peak but business hours

def _platform_base_donation(platform: str) -> float:
    return {
        "WhatsApp": 28000, "LinkedIn": 22000, "Facebook": 16000,
        "Instagram": 10000, "YouTube": 9000, "Twitter": 7000, "TikTok": 4000
    }.get(platform, 10000)

def _post_type_mult(post_type: str) -> float:
    return {
        "FundraisingAppeal": 2.8, "ImpactStory": 2.0, "Campaign": 1.6,
        "ThankYou": 1.0, "EventPromotion": 1.3, "EducationalContent": 0.7
    }.get(post_type, 1.0)

def _sentiment_mult(tone: str) -> float:
    return {
        "Emotional": 1.8, "Urgent": 1.6, "Hopeful": 1.4, "Inspirational": 1.3,
        "Grateful": 1.1, "Celebratory": 1.0, "Informative": 0.7
    }.get(tone, 1.0)

def _platform_impressions(platform: str, follower: int) -> int:
    """Platform-specific reach multiplier."""
    multipliers = {
        "TikTok": (3.0, 12.0), "YouTube": (0.8, 4.0), "Instagram": (1.2, 5.0),
        "Facebook": (0.4, 2.0), "Twitter": (1.5, 6.0), "LinkedIn": (0.3, 1.5),
        "WhatsApp": (0.5, 2.5)
    }
    lo, hi = multipliers.get(platform, (0.5, 2.0))
    return max(100, int(follower * random.uniform(lo, hi)))

def _engagement_metrics(platform: str, impressions: int, post_type: str, hour: int):
    """Return (reach, likes, comments, shares, saves, clicks, video_views, engagement_rate, profile_visits, forwards)."""
    reach = int(impressions * random.uniform(0.65, 0.90))
    er_base = {
        "Facebook": 0.035, "Instagram": 0.06, "WhatsApp": 0.08,
        "TikTok": 0.10, "Twitter": 0.04, "LinkedIn": 0.025, "YouTube": 0.05
    }.get(platform, 0.04)
    # Peak-hour boost
    peak_bonus = 0.02 if 8 <= hour <= 10 or 19 <= hour <= 22 else 0
    er = max(0.005, er_base + peak_bonus + random.gauss(0, 0.015))
    interactions = int(reach * er)
    # Split interactions
    like_frac = {"Facebook": 0.6, "Instagram": 0.7, "WhatsApp": 0.3, "TikTok": 0.65, "Twitter": 0.5, "LinkedIn": 0.45, "YouTube": 0.55}.get(platform, 0.55)
    likes    = max(0, int(interactions * like_frac * random.uniform(0.8, 1.2)))
    comments = max(0, int(interactions * 0.12 * random.uniform(0.5, 1.5)))
    shares   = max(0, int(interactions * 0.10 * random.uniform(0.5, 1.5)))
    saves    = max(0, int(interactions * 0.08 * random.uniform(0.3, 1.5))) if platform in ("Instagram", "TikTok") else 0
    clicks   = max(0, int(interactions * 0.15 * random.uniform(0.5, 1.5)))
    video_views = int(reach * random.uniform(0.3, 0.8)) if platform in ("TikTok", "YouTube", "Instagram") else None
    profile_visits = max(0, int(interactions * random.uniform(0.5, 2.0)))
    forwards = max(0, int(interactions * random.uniform(0.8, 3.5))) if platform == "WhatsApp" else None
    return reach, likes, comments, shares, saves, clicks, video_views, er, profile_visits, forwards

# ---------------------------------------------------------------------------
# Row generator
# ---------------------------------------------------------------------------

def generate_row(post_id: int, day: str, hour: int, platform: str,
                 post_type: str, content_topic: str, sentiment: str,
                 start_date: datetime) -> dict:
    # Date: pick a date that matches the given day of week within 2023-2026
    # Find nearest date with that weekday from start_date
    dow_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
               "Friday": 4, "Saturday": 5, "Sunday": 6}
    target_dow = dow_map[day]
    delta_days = (target_dow - start_date.weekday()) % 7
    post_date = start_date + timedelta(days=delta_days, hours=hour, minutes=random.randint(0, 59))

    media_type = random.choice(MEDIA_TYPES.get(platform, ["Photo"]))
    has_cta = random.random() < 0.65
    cta = random.choice([c for c in CTA_TYPES if c]) if has_cta else None
    hashtags = random.choice(HASHTAG_BANKS) if platform in ("Instagram", "TikTok", "Twitter", "Facebook") else ""
    num_ht = len(hashtags.split(",")) if hashtags else 0
    mentions = random.randint(0, 3)
    caption = random.choice(CAPTION_TEMPLATES)
    if has_cta:
        caption += " https://lighthouse.ph/donate?utm_source=" + platform.lower()
    caption_len = len(caption)
    features_resident = random.random() < 0.30
    is_boosted = random.random() < 0.20
    boost_budget = round(random.uniform(500, 5000), 2) if is_boosted else None
    campaign = random.choice(["YearEndDrive2025", "GivingTuesday", "EasterAppeal", None, None, None])

    # Engagement
    follower = FOLLOWER_BASE[platform] + int(post_id * random.uniform(0.3, 0.8))
    impressions = _platform_impressions(platform, follower)
    # Boost multiplies impressions
    if is_boosted and boost_budget:
        impressions = int(impressions * (1 + boost_budget / 2000))

    reach, likes, comments, shares, saves, clicks, video_views, er, profile_visits, forwards = \
        _engagement_metrics(platform, impressions, post_type, hour)

    # Donation value — combination of all multipliers with noise
    t_mult = _time_mult(day, hour)
    base = _platform_base_donation(platform)
    pt_mult = _post_type_mult(post_type)
    s_mult = _sentiment_mult(sentiment)
    cta_mult = 1.4 if has_cta else 1.0
    story_mult = 1.25 if features_resident else 1.0
    boost_mult = (1 + (boost_budget or 0) / 3000) if is_boosted else 1.0

    expected_value = base * t_mult * pt_mult * s_mult * cta_mult * story_mult * boost_mult
    # Add log-normal noise so some posts are spectacular, most are modest
    noise = np.random.lognormal(mean=0, sigma=0.6)
    raw_value = expected_value * noise
    # Many posts generate 0 donations — roughly 40% of the time for low-value combinations
    zero_prob = max(0.0, 0.45 - t_mult * 0.1)
    donation_value = 0.0 if random.random() < zero_prob else max(0.0, round(raw_value, 2))
    donation_referrals = 0 if donation_value == 0 else random.randint(1, max(1, int(donation_value / 15000) + 2))

    row = {
        "post_id": post_id,
        "platform": platform,
        "platform_post_id": f"{platform[:2].lower()}_{random.randint(1000000000, 9999999999):010d}",
        "post_url": f"https://{platform.lower()}.com/lighthouse_ph/{random.randint(100000, 999999)}",
        "created_at": post_date.strftime("%Y-%m-%d %H:%M:%S"),
        "day_of_week": day,
        "post_hour": hour,
        "post_type": post_type,
        "media_type": media_type,
        "caption": caption,
        "hashtags": hashtags,
        "num_hashtags": num_ht,
        "mentions_count": mentions,
        "has_call_to_action": has_cta,
        "call_to_action_type": cta if cta else "",
        "content_topic": content_topic,
        "sentiment_tone": sentiment,
        "caption_length": caption_len,
        "features_resident_story": features_resident,
        "campaign_name": campaign if campaign else "",
        "is_boosted": is_boosted,
        "boost_budget_php": boost_budget if boost_budget else "",
        "impressions": impressions,
        "reach": reach,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "saves": saves,
        "click_throughs": clicks,
        "video_views": video_views if video_views else "",
        "engagement_rate": round(er, 4),
        "profile_visits": profile_visits,
        "donation_referrals": donation_referrals,
        "estimated_donation_value_php": donation_value,
        "follower_count_at_post": follower,
        "watch_time_seconds": round(random.uniform(30, 600), 1) if platform in ("YouTube", "TikTok") else "",
        "avg_view_duration_seconds": round(random.uniform(15, 300), 1) if platform in ("YouTube", "TikTok") else "",
        "subscriber_count_at_post": follower if platform == "YouTube" else "",
        "forwards": forwards if forwards else "",
    }
    return row

# ---------------------------------------------------------------------------
# Build row set: ~2520 rows (15 per day × 24 hours × 7 days = 2520)
# ---------------------------------------------------------------------------

def build_rows(start_id: int) -> list[dict]:
    rows = []
    pid = start_id
    # Distribute a start date spread across 3 years
    base_date = datetime(2023, 1, 16)  # Monday, starting after existing data

    # Per (day, hour): generate 15 rows with varied feature combos
    platforms_cycle  = PLATFORMS * 10
    post_types_cycle = POST_TYPES * 10
    topics_cycle     = CONTENT_TOPICS * 10
    sentiments_cycle = SENTIMENT_TONES * 10

    combo_idx = 0
    # Advance start date a bit per (day, hour) group so dates stay spread
    date_offset = timedelta(days=0)

    for di, day in enumerate(DAYS):
        for hour in range(24):
            # Skip overnight slots (0-4 AM) — add only 3 rows each (noise data)
            n_rows = 3 if 0 <= hour < 5 else 15
            for k in range(n_rows):
                platform   = platforms_cycle[(combo_idx + k * 3) % len(PLATFORMS)]
                post_type  = post_types_cycle[(combo_idx + k * 5) % len(POST_TYPES)]
                topic      = topics_cycle[(combo_idx + k * 7) % len(CONTENT_TOPICS)]
                sentiment_ = sentiments_cycle[(combo_idx + k * 11) % len(SENTIMENT_TONES)]
                # Advance base_date slightly per row so no two rows are identical
                row_date = base_date + date_offset + timedelta(weeks=combo_idx % 52, days=k * 3)
                rows.append(generate_row(pid, day, hour, platform, post_type, topic, sentiment_, row_date))
                pid += 1
            combo_idx += 1
    print(f"Generated {len(rows)} rows (IDs {start_id} – {pid - 1})")
    return rows

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 1. Load existing CSV to find max ID
    existing = pd.read_csv(CSV_PATH)
    start_id = int(existing["post_id"].max()) + 1
    print(f"Existing rows: {len(existing)}, starting new IDs at {start_id}")

    # 2. Generate rows
    rows = build_rows(start_id)
    new_df = pd.DataFrame(rows)

    # 3. Append to CSV
    new_df.to_csv(CSV_PATH, mode="a", header=False, index=False)
    total = len(existing) + len(new_df)
    print(f"CSV updated: {total} total rows -> {CSV_PATH}")

    # 4. Seed into Supabase
    print("\nConnecting to Supabase...")
    conn = psycopg2.connect(CONN_STR)
    cur = conn.cursor()

    # Build parameterised INSERT
    cols = [
        "post_id", "platform", "platform_post_id", "post_url", "created_at",
        "day_of_week", "post_hour", "post_type", "media_type", "caption", "hashtags",
        "num_hashtags", "mentions_count", "has_call_to_action", "call_to_action_type",
        "content_topic", "sentiment_tone", "caption_length", "features_resident_story",
        "campaign_name", "is_boosted", "boost_budget_php", "impressions", "reach",
        "likes", "comments", "shares", "saves", "click_throughs", "video_views",
        "engagement_rate", "profile_visits", "donation_referrals",
        "estimated_donation_value_php", "follower_count_at_post",
        "watch_time_seconds", "avg_view_duration_seconds", "subscriber_count_at_post",
        "forwards",
    ]
    quoted_cols = ", ".join(f'"{c}"' for c in cols)
    placeholders = ", ".join(["%s"] * len(cols))
    sql = f'INSERT INTO public.social_media_posts ({quoted_cols}) VALUES ({placeholders}) ON CONFLICT ("post_id") DO NOTHING'

    inserted = 0
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        values = []
        for r in batch:
            def coerce(v):
                if v == "" or v is None:
                    return None
                if isinstance(v, bool):
                    return v
                return v
            values.append(tuple(coerce(r[c]) for c in cols))
        cur.executemany(sql, values)
        inserted += len(batch)
        if inserted % 500 == 0:
            print(f"  Inserted {inserted}/{len(rows)}...")
    conn.commit()
    cur.close()
    conn.close()
    print(f"Done! {inserted} rows seeded into Supabase.")

if __name__ == "__main__":
    main()
