"""Shared ML pipeline utilities - Ch. 6, 7, 8 references."""
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.stats.outliers_influence import variance_inflation_factor


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
