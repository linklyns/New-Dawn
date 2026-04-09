"""Shared ML pipeline utilities - Ch. 6, 7, 8, 10-14 references."""
import os
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.stats.outliers_influence import variance_inflation_factor
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, roc_auc_score, mean_squared_error,
                             mean_absolute_error, r2_score)
from sklearn.feature_selection import RFECV
from datetime import datetime


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def get_csv_path():
    """Return absolute path to lighthouse_csv_v7/ regardless of cwd."""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        '..', 'lighthouse_csv_v7')


def get_models_path():
    """Return absolute path to ml-pipelines/models/."""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')


def load_csv(name):
    """Load a CSV from lighthouse_csv_v7/ by filename (e.g. 'supporters')."""
    path = os.path.join(get_csv_path(), f'{name}.csv')
    return pd.read_csv(path)


def save_pipeline_output(df, filename):
    """Save DataFrame to ml-pipelines/models/{filename} with timestamp log."""
    out = os.path.join(get_models_path(), filename)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    df.to_csv(out, index=False)
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Saved {len(df)} rows → {out}")
    return out


# ---------------------------------------------------------------------------
# Boost budget binning (shared by Pipeline 02 & 03)
# ---------------------------------------------------------------------------

def bin_boost_budget(series):
    """Bin boost_budget_php into 4 ordered categories.

    Bins:
      - "none"   : value == 0
      - "low"    : 0 < value <= Q1 of non-zero values
      - "medium" : Q1 < value <= Q3 of non-zero values
      - "high"   : value > Q3 of non-zero values

    Returns:
        (binned_series, {'q1': float, 'q3': float})
        If there are no non-zero values, every row is "none" and q1=q3=0.
    """
    import json as _json

    s = pd.to_numeric(series, errors='coerce').fillna(0)
    nonzero = s[s > 0]

    if len(nonzero) == 0:
        return s.map(lambda _: 'none'), {'q1': 0.0, 'q3': 0.0}

    q1 = float(nonzero.quantile(0.25))
    q3 = float(nonzero.quantile(0.75))

    def _label(v):
        if v == 0:
            return 'none'
        elif v <= q1:
            return 'low'
        elif v <= q3:
            return 'medium'
        else:
            return 'high'

    return s.map(_label), {'q1': q1, 'q3': q3}


def save_boost_bin_thresholds(thresholds):
    """Persist boost-bin thresholds as JSON so the backend can load them."""
    import json as _json
    out = os.path.join(get_models_path(), 'boost_bin_thresholds.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        _json.dump(thresholds, f)
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Saved boost thresholds → {out}")
    return out


# ---------------------------------------------------------------------------
# Model evaluation (Ch. 10-12)
# ---------------------------------------------------------------------------

def evaluate_classifiers(X, y, models_dict, cv=5, scoring_focus='f1'):
    """Run StratifiedKFold CV on multiple classifiers. Returns comparison DataFrame."""
    results = []
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    for name, model in models_dict.items():
        acc = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
        prec = cross_val_score(model, X, y, cv=skf, scoring='precision_weighted')
        rec = cross_val_score(model, X, y, cv=skf, scoring='recall_weighted')
        f1 = cross_val_score(model, X, y, cv=skf, scoring='f1_weighted')
        try:
            auc = cross_val_score(model, X, y, cv=skf, scoring='roc_auc_ovr_weighted')
            auc_mean = auc.mean()
        except Exception:
            auc_mean = np.nan
        results.append({
            'Model': name,
            'Accuracy': round(acc.mean(), 4),
            'Precision': round(prec.mean(), 4),
            'Recall': round(rec.mean(), 4),
            'F1': round(f1.mean(), 4),
            'AUC': round(auc_mean, 4) if not np.isnan(auc_mean) else 'N/A'
        })
        print(f"  {name}: Acc={acc.mean():.4f} Prec={prec.mean():.4f} "
              f"Rec={rec.mean():.4f} F1={f1.mean():.4f}")
    return pd.DataFrame(results).sort_values('F1', ascending=False)


def evaluate_regressors(X, y, models_dict, cv=5):
    """Run KFold CV on multiple regressors. Returns comparison DataFrame with RMSE, MAE, R²."""
    results = []
    kf = KFold(n_splits=cv, shuffle=True, random_state=42)
    for name, model in models_dict.items():
        neg_mse = cross_val_score(model, X, y, cv=kf, scoring='neg_mean_squared_error')
        neg_mae = cross_val_score(model, X, y, cv=kf, scoring='neg_mean_absolute_error')
        r2 = cross_val_score(model, X, y, cv=kf, scoring='r2')
        rmse = np.sqrt(-neg_mse.mean())
        mae = -neg_mae.mean()
        results.append({
            'Model': name,
            'RMSE': round(rmse, 4),
            'MAE': round(mae, 4),
            'R2': round(r2.mean(), 4),
        })
        print(f"  {name}: RMSE={rmse:.4f} MAE={mae:.4f} R²={r2.mean():.4f}")
    return pd.DataFrame(results).sort_values('RMSE')


# ---------------------------------------------------------------------------
# Feature importance & selection (Ch. 13-14)
# ---------------------------------------------------------------------------

def feature_importance_report(model, feature_names):
    """Extract feature importances from tree/ensemble models. Returns sorted DataFrame."""
    if hasattr(model, 'feature_importances_'):
        imp = model.feature_importances_
    elif hasattr(model, 'coef_'):
        imp = np.abs(model.coef_).flatten()
    else:
        raise ValueError("Model has no feature_importances_ or coef_")
    df = pd.DataFrame({'feature': feature_names, 'importance': imp})
    return df.sort_values('importance', ascending=False).reset_index(drop=True)


def rfecv_selection(X, y, estimator, cv=5, scoring='f1_weighted', min_features=3):
    """RFECV wrapper. Returns selected feature mask and selector object."""
    selector = RFECV(estimator, step=1, cv=cv, scoring=scoring,
                     min_features_to_select=min_features, n_jobs=-1)
    selector.fit(X, y)
    selected = X.columns[selector.support_].tolist()
    print(f"RFECV selected {len(selected)}/{X.shape[1]} features: {selected}")
    return selector, selected


def plot_model_comparison(results_df, metric='F1', title='Model Comparison'):
    """Bar chart comparing models on a given metric."""
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.barh(results_df['Model'], results_df[metric], color='#A2C9E1')
    ax.set_xlabel(metric)
    ax.set_title(title)
    ax.invert_yaxis()
    for bar, val in zip(bars, results_df[metric]):
        ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f'{val:.4f}', va='center', fontsize=9)
    plt.tight_layout()
    plt.show()


def unistats(df):
    """Univariate profiling (Ch. 6). Returns DataFrame with dtype, count, missing%, unique, mean/median/std/skew/kurtosis for numeric, mode/top_freq for categorical."""
    results = []
    for col in df.columns:
        info = {'column': col, 'dtype': str(df[col].dtype), 'count': df[col].count(),
                'missing_pct': round(df[col].isna().mean() * 100, 2), 'unique': df[col].nunique()}
        if pd.api.types.is_numeric_dtype(df[col]):
            info.update({'mean': round(df[col].mean(), 4), 'median': round(df[col].median(), 4),
                        'std': round(df[col].std(), 4), 'skew': round(df[col].skew(), 4),
                        'kurtosis': round(df[col].kurtosis(), 4), 'min': df[col].min(), 'max': df[col].max()})
        else:
            mode_val = df[col].mode()
            info.update({'mode': mode_val.iloc[0] if len(mode_val) > 0 else None,
                        'top_freq': df[col].value_counts().iloc[0] if len(df[col].value_counts()) > 0 else 0})
        results.append(info)
    return pd.DataFrame(results).set_index('column')


def bin_categories(df, col, threshold=0.05):
    """Bin low-frequency categories into 'Other' (Ch. 7)."""
    freq = df[col].value_counts(normalize=True)
    small = freq[freq < threshold].index
    df = df.copy()
    df[col] = df[col].replace(small, 'Other')
    return df


def skew_correct(df, col, method='log'):
    """Apply skew correction (Ch. 7). Methods: log, boxcox, yeojohnson."""
    df = df.copy()
    if method == 'log':
        df[col] = np.log1p(df[col])
    elif method == 'boxcox':
        df[col], _ = stats.boxcox(df[col] + 1)
    elif method == 'yeojohnson':
        df[col], _ = stats.yeojohnson(df[col])
    return df


def missing_drop(df, threshold=0.5):
    """Drop columns above missing threshold (Ch. 7)."""
    missing_pct = df.isna().mean()
    drop_cols = missing_pct[missing_pct > threshold].index.tolist()
    print(f"Dropping {len(drop_cols)} columns with >{threshold*100}% missing: {drop_cols}")
    return df.drop(columns=drop_cols)


def missing_fill(df, col, strategy='median'):
    """Fill missing values (Ch. 7). Strategies: median, mean, mode, zero."""
    df = df.copy()
    if strategy == 'median':
        df[col] = df[col].fillna(df[col].median())
    elif strategy == 'mean':
        df[col] = df[col].fillna(df[col].mean())
    elif strategy == 'mode':
        df[col] = df[col].fillna(df[col].mode().iloc[0])
    elif strategy == 'zero':
        df[col] = df[col].fillna(0)
    return df


def clean_outlier(df, col, method='iqr', factor=1.5):
    """Handle outliers via IQR capping or z-score removal (Ch. 7)."""
    df = df.copy()
    if method == 'iqr':
        Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower, upper = Q1 - factor * IQR, Q3 + factor * IQR
        df[col] = df[col].clip(lower, upper)
    elif method == 'zscore':
        z = np.abs(stats.zscore(df[col].dropna()))
        df = df[np.abs(stats.zscore(df[col].fillna(df[col].median()))) < factor]
    return df


def n2n_analysis(df, col1, col2):
    """N2N: Pearson r + scatterplot (Ch. 8)."""
    clean = df[[col1, col2]].dropna()
    r, p = stats.pearsonr(clean[col1], clean[col2])
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(clean[col1], clean[col2], alpha=0.5, color='#91B191')
    ax.set_xlabel(col1)
    ax.set_ylabel(col2)
    ax.set_title(f'{col1} vs {col2} (r={r:.3f}, p={p:.4f})')
    plt.tight_layout()
    plt.show()
    return {'pearson_r': r, 'p_value': p}


def n2c_analysis(df, numeric_col, cat_col):
    """N2C: ANOVA F-test + mean-value bar chart (Ch. 8)."""
    groups = [g[numeric_col].dropna().values for _, g in df.groupby(cat_col)]
    if len(groups) >= 2:
        f_stat, p_val = stats.f_oneway(*groups)
    else:
        f_stat, p_val = 0, 1
    means = df.groupby(cat_col)[numeric_col].mean().sort_values(ascending=False)
    fig, ax = plt.subplots(figsize=(10, 5))
    means.plot(kind='bar', ax=ax, color='#A2C9E1')
    ax.set_title(f'{numeric_col} by {cat_col} (F={f_stat:.2f}, p={p_val:.4f})')
    ax.set_ylabel(numeric_col)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.show()
    return {'f_statistic': f_stat, 'p_value': p_val}


def c2c_analysis(df, col1, col2):
    """C2C: Chi-square + crosstab heatmap (Ch. 8)."""
    ct = pd.crosstab(df[col1], df[col2])
    chi2, p, dof, expected = stats.chi2_contingency(ct)
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap(ct, annot=True, fmt='d', cmap='YlOrRd', ax=ax)
    ax.set_title(f'{col1} vs {col2} (chi2={chi2:.2f}, p={p:.4f})')
    plt.tight_layout()
    plt.show()
    return {'chi2': chi2, 'p_value': p, 'dof': dof}


def calculate_vif(df):
    """Calculate VIF for numeric columns."""
    numeric_df = df.select_dtypes(include=[np.number]).dropna()
    vif_data = pd.DataFrame()
    vif_data['feature'] = numeric_df.columns
    vif_data['VIF'] = [variance_inflation_factor(numeric_df.values, i) for i in range(numeric_df.shape[1])]
    return vif_data.sort_values('VIF', ascending=False)
