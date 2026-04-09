"""Pipeline 1 — Donor Likelihood to Donate Again (Time-Series Snapshot).

Uses a temporal cutoff approach to avoid data leakage:
  - Features (X): computed from donations BEFORE a cutoff date
  - Label   (y): 1 if the supporter donated in the window AFTER the cutoff

Reads supporters, donations, donation_allocations CSVs (or DB), engineers
supporter-level RFM + behavioural features, trains an ensemble classifier,
and outputs supporter_predictions.csv with likelihood_category and SHAP
reasons.
"""
import os, sys, warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from sklearn.model_selection import StratifiedKFold, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import f1_score, roc_auc_score
import joblib

# Allow imports from parent
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions import (load_csv, save_pipeline_output, evaluate_classifiers,
                       feature_importance_report, rfecv_selection, get_models_path)


# ── constants ────────────────────────────────────────────────────────────────

LABEL_WINDOW_DAYS = 180  # 6-month future window for the label

FEATURE_COLS = [
    'total_donation_amount', 'donation_count', 'average_donation_amount',
    'days_since_last_donation', 'time_since_first_donation',
    'donation_frequency', 'is_recurring_donor',
    'number_of_campaigns_supported', 'number_of_program_areas_supported',
    'avg_donation_interval', 'donation_type_diversity', 'channel_diversity',
]

CAT_FEATURES = ['supporter_type', 'region', 'country', 'acquisition_channel']

REASON_MAP = {
    'days_since_last_donation': 'Time since last donation',
    'total_donation_amount': 'Total lifetime giving',
    'donation_count': 'Number of past donations',
    'average_donation_amount': 'Average donation size',
    'donation_frequency': 'Donation frequency',
    'is_recurring_donor': 'Recurring donor status',
    'time_since_first_donation': 'Length of relationship',
    'number_of_campaigns_supported': 'Campaign engagement breadth',
    'number_of_program_areas_supported': 'Program area diversity',
    'avg_donation_interval': 'Average time between gifts',
    'donation_type_diversity': 'Variety of donation types',
    'channel_diversity': 'Variety of giving channels',
}


# ── feature engineering ──────────────────────────────────────────────────────

def engineer_features(supporters, donations, allocations, cutoff_date=None):
    """Build one row per supporter with behavioural features.

    STRICT FILTERING: Only donations where donation_date <= cutoff_date are
    used.  An assertion verifies no future donations leaked through.

    Args:
        cutoff_date: All features computed from donations on or before this
            date.  If None, uses the latest donation date (for final
            prediction on full data).
    Returns:
        (df, cutoff_date_used)
    """
    donations = donations.copy()
    donations['donation_date'] = pd.to_datetime(donations['donation_date'])
    donations['amount'] = pd.to_numeric(donations['amount'], errors='coerce')
    donations['is_recurring'] = (donations['is_recurring'].astype(str)
                                 .str.strip().str.lower() == 'true')

    if cutoff_date is None:
        cutoff_date = donations['donation_date'].max()
    else:
        cutoff_date = pd.to_datetime(cutoff_date)

    # ── STRICT FILTER: drop ALL future donations ──
    donations = donations[donations['donation_date'] <= cutoff_date]
    assert donations['donation_date'].max() <= cutoff_date, \
        "Data leakage: donations after cutoff_date survived filtering!"

    # Also filter allocations to only those matching remaining donations
    valid_donation_ids = set(donations['donation_id'])
    allocations = allocations[allocations['donation_id'].isin(valid_donation_ids)]

    # ── Monetary amounts ──
    monetary = donations[donations['donation_type'] == 'Monetary']
    amt_agg = monetary.groupby('supporter_id').agg(
        total_donation_amount=('amount', 'sum'),
        monetary_count=('amount', 'count'),
        average_donation_amount=('amount', 'mean'),
    ).reset_index()

    # ── All-donations features ──
    don_agg = donations.groupby('supporter_id').agg(
        donation_count=('donation_id', 'count'),
        last_donation_date=('donation_date', 'max'),
        first_donation_date=('donation_date', 'min'),
        is_recurring_donor=('is_recurring', 'max'),
        donation_type_diversity=('donation_type', 'nunique'),
        channel_diversity=('channel_source', 'nunique'),
        number_of_campaigns_supported=(
            'campaign_name',
            lambda x: x.dropna().replace('', np.nan).nunique()),
    ).reset_index()

    don_agg['days_since_last_donation'] = (
        cutoff_date - don_agg['last_donation_date']).dt.days
    don_agg['time_since_first_donation'] = (
        cutoff_date - don_agg['first_donation_date']).dt.days
    don_agg['donation_frequency'] = (
        don_agg['donation_count']
        / (don_agg['time_since_first_donation'].clip(lower=1) / 365.25))
    don_agg['is_recurring_donor'] = don_agg['is_recurring_donor'].astype(int)

    # ── Average interval between consecutive donations ──
    sorted_don = donations.sort_values(['supporter_id', 'donation_date'])
    sorted_don['prev_date'] = sorted_don.groupby(
        'supporter_id')['donation_date'].shift(1)
    sorted_don['interval'] = (
        sorted_don['donation_date'] - sorted_don['prev_date']).dt.days
    interval_agg = (sorted_don.groupby('supporter_id')['interval']
                    .mean().reset_index())
    interval_agg.columns = ['supporter_id', 'avg_donation_interval']

    # ── Program areas from allocations ──
    don_alloc = donations[['donation_id', 'supporter_id']].merge(
        allocations[['donation_id', 'program_area']],
        on='donation_id', how='inner')
    prog_agg = (don_alloc.groupby('supporter_id')['program_area']
                .nunique().reset_index())
    prog_agg.columns = ['supporter_id', 'number_of_program_areas_supported']

    # ── Merge everything onto supporter base ──
    df = supporters[['supporter_id', 'display_name', 'first_name', 'last_name',
                     'email', 'supporter_type', 'region', 'country',
                     'status', 'first_donation_date',
                     'acquisition_channel']].copy()
    df = df.merge(don_agg, on='supporter_id', how='left')
    df = df.merge(amt_agg, on='supporter_id', how='left')
    df = df.merge(interval_agg, on='supporter_id', how='left')
    df = df.merge(prog_agg, on='supporter_id', how='left')

    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    return df, cutoff_date


def build_labels(df, all_donations, cutoff_date, label_window_days=LABEL_WINDOW_DAYS):
    """Create binary label: 1 if supporter donated after cutoff_date.

    Args:
        df: feature DataFrame from engineer_features (one row per supporter).
        all_donations: the FULL (unfiltered) donations DataFrame.
        cutoff_date: boundary date.
        label_window_days: how many days after cutoff to check for donations.
    Returns:
        df with a 'donated_after_cutoff' column.
    """
    all_donations = all_donations.copy()
    all_donations['donation_date'] = pd.to_datetime(all_donations['donation_date'])

    window_end = cutoff_date + timedelta(days=label_window_days)
    future = all_donations[
        (all_donations['donation_date'] > cutoff_date)
        & (all_donations['donation_date'] <= window_end)]

    donors_in_window = set(future['supporter_id'].unique())
    df = df.copy()
    df['donated_after_cutoff'] = df['supporter_id'].isin(donors_in_window).astype(int)
    return df


# ── modelling helpers ────────────────────────────────────────────────────────

def prepare_modelling_data(df, target_col='donated_after_cutoff'):
    """Encode categoricals and return X, y, feature names."""
    model_df = df.copy()
    model_df = pd.get_dummies(model_df, columns=CAT_FEATURES,
                              drop_first=True, dtype=int)

    feature_cols = FEATURE_COLS.copy()
    for col in model_df.columns:
        if any(col.startswith(f'{cat}_') for cat in CAT_FEATURES):
            feature_cols.append(col)

    X = model_df[feature_cols].copy()
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

    y = model_df[target_col] if target_col in model_df.columns else None
    return X, y, feature_cols


def _build_temporal_folds(all_donations, n_folds=4,
                          label_window_days=LABEL_WINDOW_DAYS):
    """Generate cutoff dates for expanding-window temporal CV.

    Returns n_folds cutoff dates.  CV will train on fold i, test on fold
    i+1, so we need at least n_folds=3 to get 2 train/test pairs.
    """
    all_donations = all_donations.copy()
    all_donations['donation_date'] = pd.to_datetime(all_donations['donation_date'])
    min_date = all_donations['donation_date'].min()
    max_date = all_donations['donation_date'].max()

    latest_cutoff = max_date - timedelta(days=label_window_days)
    earliest_cutoff = min_date + timedelta(days=365)

    if latest_cutoff <= earliest_cutoff:
        return []

    step = (latest_cutoff - earliest_cutoff) / max(n_folds - 1, 1)
    cutoffs = [earliest_cutoff + step * i for i in range(n_folds)]
    return cutoffs


def train_best_model(X, y, feature_names, supporters, all_donations,
                     allocations):
    """Compare 6 classifiers via temporal or stratified CV, tune, return."""
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=200, random_state=42),
        'XGBoost': XGBClassifier(n_estimators=200, use_label_encoder=False,
                                  eval_metric='logloss', random_state=42, verbosity=0),
        'LightGBM': LGBMClassifier(n_estimators=200, random_state=42, verbose=-1),
    }

    # ── Attempt temporal cross-validation ──
    temporal_cutoffs = _build_temporal_folds(all_donations, n_folds=4)
    use_temporal = len(temporal_cutoffs) >= 3  # need ≥2 train/test pairs

    if use_temporal:
        # Check each fold has enough positive labels for both train + test
        for tc in temporal_cutoffs:
            df_tmp, _ = engineer_features(supporters, all_donations,
                                          allocations, cutoff_date=tc)
            df_tmp = build_labels(df_tmp, all_donations, tc)
            # Only count supporters who had pre-cutoff donations
            trainable = df_tmp[df_tmp['donation_count'] > 0]
            pos = trainable['donated_after_cutoff'].sum()
            if pos < 3 or (len(trainable) - pos) < 3:
                use_temporal = False
                break

    if use_temporal:
        print(f"\n── Temporal CV ({len(temporal_cutoffs)} folds) ──")
        results = _temporal_cv_evaluate(
            models, supporters, all_donations, allocations, temporal_cutoffs)
    else:
        print("\n── Falling back to StratifiedKFold=5 (dataset too small "
              "for temporal splits) ──")
        results = evaluate_classifiers(X, y, models, cv=5)

    print(results.to_string(index=False))
    best_name = results.iloc[0]['Model']
    print(f"\nBest model by F1: {best_name}")

    # ── Hyperparameter tuning ──
    param_grids = {
        'Random Forest': {
            'n_estimators': [100, 300, 500],
            'max_depth': [5, 10, None],
            'min_samples_leaf': [1, 3, 5],
        },
        'Gradient Boosting': {
            'n_estimators': [100, 300],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.05, 0.1, 0.2],
        },
        'XGBoost': {
            'n_estimators': [100, 300],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.05, 0.1, 0.2],
        },
        'LightGBM': {
            'n_estimators': [100, 300],
            'max_depth': [5, 10, -1],
            'learning_rate': [0.05, 0.1, 0.2],
        },
    }

    base_model = models[best_name]
    if best_name in param_grids:
        print(f"\n── GridSearchCV tuning {best_name} ──")
        cv_inner = min(5, max(2, int(y.sum()), int((y == 0).sum())))
        grid = GridSearchCV(base_model, param_grids[best_name],
                            cv=StratifiedKFold(cv_inner, shuffle=True,
                                               random_state=42),
                            scoring='f1_weighted', n_jobs=-1, verbose=0)
        grid.fit(X, y)
        best_model = grid.best_estimator_
        print(f"Best params: {grid.best_params_}")
        print(f"Best CV F1: {grid.best_score_:.4f}")
    else:
        best_model = base_model
        best_model.fit(X, y)

    return best_model, results, best_name


def _temporal_cv_evaluate(models, supporters, all_donations, allocations,
                          cutoffs):
    """Evaluate models with expanding-window temporal CV.

    For each consecutive pair (cutoff_i, cutoff_{i+1}):
      - Train: features from before cutoff_i, labels from cutoff_i window
      - Test:  features from before cutoff_{i+1}, labels from cutoff_{i+1} window
    This ensures the test set is truly unseen data from a later time period.
    """
    fold_scores = {name: {'f1': [], 'auc': []} for name in models}

    for i in range(len(cutoffs) - 1):
        train_cutoff = cutoffs[i]
        test_cutoff = cutoffs[i + 1]
        print(f"  Fold {i+1}: train≤{train_cutoff.date()} → "
              f"test≤{test_cutoff.date()}")

        # Build training data
        df_train, _ = engineer_features(supporters, all_donations,
                                        allocations, cutoff_date=train_cutoff)
        df_train = build_labels(df_train, all_donations, train_cutoff)
        trainable = df_train[df_train['donation_count'] > 0].copy()
        X_tr, y_tr, feat_tr = prepare_modelling_data(trainable)

        # Build test data
        df_test, _ = engineer_features(supporters, all_donations,
                                       allocations, cutoff_date=test_cutoff)
        df_test = build_labels(df_test, all_donations, test_cutoff)
        testable = df_test[df_test['donation_count'] > 0].copy()
        X_te, y_te, feat_te = prepare_modelling_data(testable)

        # Align columns (test may have extra/missing one-hot cols)
        for col in feat_tr:
            if col not in X_te.columns:
                X_te[col] = 0
        X_te = X_te[feat_tr]

        pos_tr, pos_te = int(y_tr.sum()), int(y_te.sum())
        print(f"    Train: {len(X_tr)} (pos={pos_tr}) | "
              f"Test: {len(X_te)} (pos={pos_te})")

        for name, model in models.items():
            try:
                model_clone = model.__class__(**model.get_params())
                model_clone.fit(X_tr, y_tr)
                y_pred = model_clone.predict(X_te)
                y_proba = model_clone.predict_proba(X_te)[:, 1]
                f1 = f1_score(y_te, y_pred, average='weighted')
                try:
                    auc = roc_auc_score(y_te, y_proba)
                except ValueError:
                    auc = np.nan
                fold_scores[name]['f1'].append(f1)
                fold_scores[name]['auc'].append(auc)
            except Exception as e:
                print(f"    {name} failed: {e}")

    rows = []
    for name in models:
        f1_vals = fold_scores[name]['f1']
        auc_vals = fold_scores[name]['auc']
        rows.append({
            'Model': name,
            'F1': round(np.mean(f1_vals), 4) if f1_vals else 0,
            'AUC': round(np.nanmean(auc_vals), 4) if auc_vals else 'N/A',
        })
    return pd.DataFrame(rows).sort_values('F1', ascending=False)


# ── prediction & calibration ────────────────────────────────────────────────

def _maybe_calibrate(model, X, y):
    """Wrap in CalibratedClassifierCV if probabilities are too confident."""
    proba = model.predict_proba(X)[:, 1]
    std = proba.std()
    # If nearly all probabilities are near 0 or 1, calibrate
    if std < 0.15 or (np.mean((proba > 0.9) | (proba < 0.1)) > 0.8):
        print("  Probabilities too confident — applying isotonic calibration")
        cv_folds = min(5, max(2, int(y.sum()), int((y == 0).sum())))
        cal = CalibratedClassifierCV(model, method='isotonic', cv=cv_folds)
        cal.fit(X, y)
        return cal
    return model


def generate_predictions(df, model, X, feature_names):
    """Generate likelihood predictions with SHAP-based top reasons."""
    proba = model.predict_proba(X)
    # Positive class (1 = donated after cutoff) → likelihood to donate
    pos_idx = list(model.classes_).index(1) if 1 in model.classes_ else 1
    scores = proba[:, pos_idx]

    df = df.copy()
    df['likelihood_score'] = np.round(scores, 4)

    # Print distribution summary for visibility
    print(f"\n── Likelihood score distribution ──")
    desc = pd.Series(scores).describe(percentiles=[.1, .25, .5, .75, .9])
    for k, v in desc.items():
        print(f"  {k}: {v:.4f}")

    # Map to categories (High > 0.7, Medium 0.3–0.7, Low < 0.3)
    df['likelihood_category'] = pd.cut(
        df['likelihood_score'],
        bins=[-0.01, 0.3, 0.7, 1.01],
        labels=['Low', 'Medium', 'High']
    )

    # ── SHAP-based top reasons ──
    # Unwrap CalibratedClassifierCV to get the base estimator for SHAP
    shap_model = model
    if hasattr(model, 'calibrated_classifiers_'):
        shap_model = model.calibrated_classifiers_[0].estimator

    try:
        import shap
        explainer = shap.TreeExplainer(shap_model)
        shap_values = explainer.shap_values(X)
        # Binary classifiers may return list [class_0, class_1] or 3D array
        if isinstance(shap_values, list):
            sv = shap_values[pos_idx]
        elif shap_values.ndim == 3:
            sv = shap_values[:, :, pos_idx]
        else:
            sv = shap_values
        reasons_1, reasons_2 = [], []
        for i in range(len(sv)):
            row_shap = pd.Series(sv[i], index=feature_names)
            top = row_shap.abs().nlargest(2).index.tolist()
            r1 = REASON_MAP.get(top[0], top[0]) if len(top) > 0 else ''
            r2 = REASON_MAP.get(top[1], top[1]) if len(top) > 1 else ''
            reasons_1.append(r1)
            reasons_2.append(r2)
        df['top_reason_1'] = reasons_1
        df['top_reason_2'] = reasons_2
    except Exception as e:
        print(f"SHAP failed ({e}), falling back to feature importance")
        imp = feature_importance_report(shap_model, feature_names)
        r1 = REASON_MAP.get(imp.iloc[0]['feature'], imp.iloc[0]['feature'])
        r2 = REASON_MAP.get(imp.iloc[1]['feature'], imp.iloc[1]['feature'])
        df['top_reason_1'] = r1
        df['top_reason_2'] = r2

    return df


def build_output(df):
    """Select and format final CSV columns."""
    out_cols = [
        'supporter_id', 'display_name', 'first_name', 'last_name', 'email',
        'likelihood_score', 'likelihood_category',
        'total_donation_amount', 'donation_count', 'days_since_last_donation',
        'top_reason_1', 'top_reason_2',
    ]
    out = df[out_cols].copy()
    out['total_donation_amount'] = out['total_donation_amount'].round(2)
    out['days_since_last_donation'] = out['days_since_last_donation'].astype(int)
    return out.sort_values('likelihood_score', ascending=False)


# ── Public entry point ────────────────────────────────────────────────────

def run(supporters=None, donations=None, allocations=None):
    """Full pipeline: temporal split → train → predict on full data → save.

    Time-Series Snapshot approach:
      1. Pick a cutoff date (6 months before latest donation).
      2. Build features from donations BEFORE the cutoff.
      3. Label = 1 if supporter donated in the 6-month window AFTER cutoff.
      4. Train model on this temporal split.
      5. For final predictions, re-engineer features using ALL data up to
         today, and predict_proba for every supporter.

    Returns:
        (output_df, model, results_df)
    """
    print("=" * 60)
    print("Pipeline 1: Donor Likelihood to Donate Again")
    print("         (Time-Series Snapshot — no data leakage)")
    print("=" * 60)

    # 1. Load data
    if supporters is None:
        supporters = load_csv('supporters')
    if donations is None:
        donations = load_csv('donations')
    if allocations is None:
        allocations = load_csv('donation_allocations')

    all_donations = donations.copy()
    all_donations['donation_date'] = pd.to_datetime(all_donations['donation_date'])
    max_date = all_donations['donation_date'].max()

    print(f"Supporters: {len(supporters)} | Donations: {len(donations)} "
          f"| Allocations: {len(allocations)}")
    print(f"Donation date range: {all_donations['donation_date'].min().date()} "
          f"→ {max_date.date()}")

    # 2. Define training cutoff (6 months before latest donation)
    cutoff_date = max_date - timedelta(days=LABEL_WINDOW_DAYS)
    print(f"\nTraining cutoff: {cutoff_date.date()}")
    print(f"Label window:   {cutoff_date.date()} → {max_date.date()} "
          f"({LABEL_WINDOW_DAYS} days)")

    # 3. Engineer features from PRE-CUTOFF data only
    df_train, _ = engineer_features(supporters, all_donations, allocations,
                                    cutoff_date=cutoff_date)

    # 4. Build labels from POST-CUTOFF donations
    df_train = build_labels(df_train, all_donations, cutoff_date)

    # Only train on supporters who had at least one pre-cutoff donation
    trainable = df_train[df_train['donation_count'] > 0].copy()
    excluded = len(df_train) - len(trainable)
    pos = int(trainable['donated_after_cutoff'].sum())
    neg = len(trainable) - pos
    print(f"Trainable supporters: {len(trainable)} "
          f"(excluded {excluded} with no pre-cutoff donations)")
    print(f"Label balance: {pos} donated after cutoff ({pos/len(trainable):.1%})"
          f" | {neg} did not ({neg/len(trainable):.1%})")

    # 5. Prepare modelling data
    X, y, feature_names = prepare_modelling_data(trainable)
    print(f"Features: {len(feature_names)} | Samples: {len(X)}")

    # 6. Train & select best model (temporal or stratified CV)
    best_model, results, best_name = train_best_model(
        X, y, feature_names, supporters, all_donations, allocations)

    # 7. Feature selection (RFECV)
    try:
        if hasattr(best_model, 'feature_importances_'):
            selector, selected_features = rfecv_selection(
                X, y, best_model.__class__(**best_model.get_params()),
                cv=min(5, max(2, pos, neg)),
                scoring='f1_weighted', min_features=5)
        else:
            selected_features = feature_names
    except Exception as e:
        print(f"RFECV skipped: {e}")
        selected_features = feature_names

    # 8. Retrain on selected features & calibrate probabilities
    X_sel = (X[selected_features]
             if set(selected_features).issubset(X.columns) else X)
    best_model.fit(X_sel, y)
    best_model = _maybe_calibrate(best_model, X_sel, y)

    # 9. Save model
    model_path = os.path.join(get_models_path(), 'donor_likelihood_model.pkl')
    joblib.dump(best_model, model_path)
    print(f"Model saved → {model_path}")

    # 10. Final predictions: re-engineer features using ALL data (no cutoff)
    print("\n── Generating final predictions (features from full data) ──")
    df_full, full_ref = engineer_features(supporters, all_donations,
                                          allocations, cutoff_date=None)
    X_full, _, full_feat = prepare_modelling_data(df_full,
                                                  target_col=None)

    # Align columns with training features
    for col in selected_features:
        if col not in X_full.columns:
            X_full[col] = 0
    X_full_sel = X_full[selected_features]

    df_full = generate_predictions(
        df_full, best_model, X_full_sel,
        selected_features if set(selected_features).issubset(
            X_full.columns) else feature_names)

    # 11. Build & save output CSV
    output = build_output(df_full)
    save_pipeline_output(output, 'supporter_predictions.csv')

    print(f"\nLikelihood distribution:")
    print(output['likelihood_category'].value_counts().to_string())
    print("Pipeline 1 complete.\n")

    return output, best_model, results


if __name__ == '__main__':
    run()
