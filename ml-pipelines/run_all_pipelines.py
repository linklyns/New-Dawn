"""Master runner — executes all 5 ML pipelines in sequence.

Usage:
    python run_all_pipelines.py              # Run from CSV files
    python run_all_pipelines.py --from-db    # Run from Supabase PostgreSQL

Environment variables (for --from-db mode):
    DATABASE_URL   or   SUPABASE_DB_HOST / SUPABASE_DB_PORT / SUPABASE_DB_NAME /
                        SUPABASE_DB_USER / SUPABASE_DB_PASSWORD
"""
import os, sys, time, argparse, traceback, logging
from datetime import datetime
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipelines.donor_likelihood import run as run_donor
from pipelines.social_media_referrals import run as run_social
from pipelines.best_posting_times import run as run_posting
from pipelines.reintegration_causal import run as run_reintegration
from pipelines.risk_prediction import run as run_risk

# ── Logging ──────────────────────────────────────────────────────────────

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
log_file = os.path.join(LOG_DIR, 'pipeline_run.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger('ml_runner')


def load_from_db():
    """Load DataFrames from Supabase PostgreSQL."""
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'backend', 'New_Dawn', 'New_Dawn', '.env')
        load_dotenv(env_path)
    except Exception:
        pass

    from sqlalchemy import create_engine

    url = os.environ.get('DATABASE_URL')
    if not url:
        host = os.environ.get('SUPABASE_DB_HOST', 'localhost')
        port = os.environ.get('SUPABASE_DB_PORT', '5432')
        name = os.environ.get('SUPABASE_DB_NAME', 'postgres')
        user = os.environ.get('SUPABASE_DB_USER', 'postgres')
        pw = os.environ.get('SUPABASE_DB_PASSWORD', '')
        url = f'postgresql://{user}:{pw}@{host}:{port}/{name}'

    engine = create_engine(url)
    logger.info(f"Connected to database")

    tables = {
        'supporters': 'SELECT * FROM public.supporters',
        'donations': 'SELECT * FROM public.donations',
        'donation_allocations': 'SELECT * FROM public.donation_allocations',
        'social_media_posts': 'SELECT * FROM public.social_media_posts',
        'residents': 'SELECT * FROM public.residents',
    }

    data = {}
    for name, query in tables.items():
        data[name] = pd.read_sql(query, engine)
        logger.info(f"  {name}: {len(data[name])} rows")

    engine.dispose()
    return data


def main():
    parser = argparse.ArgumentParser(description='Run all New Dawn ML pipelines')
    parser.add_argument('--from-db', action='store_true',
                        help='Load data from Supabase PostgreSQL instead of CSV files')
    args = parser.parse_args()

    import pandas as pd

    logger.info("=" * 70)
    logger.info(f"ML Pipeline Run Started — {datetime.now():%Y-%m-%d %H:%M:%S}")
    logger.info("=" * 70)

    # Load data
    data = None
    if args.from_db:
        logger.info("Loading data from database...")
        data = load_from_db()

    results = {}
    pipelines = [
        ('Pipeline 1: Donor Likelihood', run_donor,
         lambda d: {'supporters': d['supporters'], 'donations': d['donations'],
                     'allocations': d['donation_allocations']} if d else {}),
        ('Pipeline 2: Social Media Referrals', run_social,
         lambda d: {'posts': d['social_media_posts']} if d else {}),
        ('Pipeline 3: Best Posting Times', run_posting,
         lambda d: {'posts': d['social_media_posts']} if d else {}),
        ('Pipeline 4: Reintegration Causal', run_reintegration,
         lambda d: {'residents': d['residents']} if d else {}),
        ('Pipeline 5: Risk Prediction', run_risk,
         lambda d: {'residents': d['residents']} if d else {}),
    ]

    for name, runner, arg_builder in pipelines:
        start = time.time()
        try:
            kwargs = arg_builder(data)
            runner(**kwargs)
            elapsed = time.time() - start
            results[name] = f"SUCCESS ({elapsed:.1f}s)"
            logger.info(f"{name}: SUCCESS ({elapsed:.1f}s)")
        except Exception as e:
            elapsed = time.time() - start
            results[name] = f"FAILED ({elapsed:.1f}s): {e}"
            logger.error(f"{name}: FAILED ({elapsed:.1f}s)")
            logger.error(traceback.format_exc())

    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("PIPELINE RUN SUMMARY")
    logger.info("=" * 70)
    all_ok = True
    for name, status in results.items():
        logger.info(f"  {name}: {status}")
        if 'FAILED' in status:
            all_ok = False

    logger.info(f"\nCompleted: {datetime.now():%Y-%m-%d %H:%M:%S}")
    logger.info("=" * 70)

    return 0 if all_ok else 1


if __name__ == '__main__':
    import pandas as pd
    sys.exit(main())
