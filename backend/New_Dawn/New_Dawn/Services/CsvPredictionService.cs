using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace New_Dawn.Services;

public class CsvPredictionService : IDisposable
{
    private readonly string _modelsPath;
    private readonly FileSystemWatcher _watcher;
    private readonly ILogger<CsvPredictionService> _logger;

    private List<Dictionary<string, string>> _supporterPredictions = [];
    private List<Dictionary<string, string>> _socialPostPredictions = [];
    private List<Dictionary<string, string>> _bestPostingTimes = [];
    private List<Dictionary<string, string>> _reintegrationCausal = [];
    private List<Dictionary<string, string>> _riskPredictions = [];

    // Boost-bin thresholds loaded from boost_bin_thresholds.json
    private decimal _boostBinQ1 = 0m;
    private decimal _boostBinQ3 = 0m;

    private readonly ConcurrentDictionary<string, DateTime> _lastReload = new();

    public CsvPredictionService(ILogger<CsvPredictionService> logger, IConfiguration config)
    {
        _logger = logger;

        _modelsPath = config["MlModelsPath"]
            ?? Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "ml-pipelines", "models");
        _modelsPath = Path.GetFullPath(_modelsPath);
        _logger.LogInformation("ML models path: {Path}", _modelsPath);

        LoadAll();

        _watcher = new FileSystemWatcher(_modelsPath, "*.csv")
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            EnableRaisingEvents = true
        };
        _watcher.Changed += OnCsvChanged;
        _watcher.Created += OnCsvChanged;
    }

    private void OnCsvChanged(object sender, FileSystemEventArgs e)
    {
        var now = DateTime.UtcNow;
        if (_lastReload.TryGetValue(e.Name!, out var last) && (now - last).TotalSeconds < 5)
            return;
        _lastReload[e.Name!] = now;

        _logger.LogInformation("CSV changed: {File}, reloading...", e.Name);
        Task.Delay(500).ContinueWith(_ => LoadFile(e.Name!));
    }

    private void LoadAll()
    {
        LoadFile("supporter_predictions.csv");
        LoadFile("social_post_predictions.csv");
        LoadFile("best_posting_times.csv");
        LoadFile("reintegration_causal_analysis.csv");
        LoadFile("risk_predictions.csv");
        LoadBoostThresholds();
    }

    private void LoadFile(string fileName)
    {
        var path = Path.Combine(_modelsPath, fileName);
        if (!File.Exists(path))
        {
            _logger.LogWarning("CSV not found: {Path}", path);
            return;
        }

        try
        {
            var rows = ParseCsv(path);
            switch (fileName)
            {
                case "supporter_predictions.csv":
                    _supporterPredictions = rows;
                    break;
                case "social_post_predictions.csv":
                    _socialPostPredictions = rows;
                    break;
                case "best_posting_times.csv":
                    _bestPostingTimes = rows;
                    break;
                case "reintegration_causal_analysis.csv":
                    _reintegrationCausal = rows;
                    break;
                case "risk_predictions.csv":
                    _riskPredictions = rows;
                    break;
            }
            _logger.LogInformation("Loaded {Count} rows from {File}", rows.Count, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load {File}", fileName);
        }
    }

    private static List<Dictionary<string, string>> ParseCsv(string path)
    {
        var lines = File.ReadAllLines(path);
        if (lines.Length == 0) return [];

        var headers = SplitCsvLine(lines[0]);
        var result = new List<Dictionary<string, string>>(lines.Length - 1);

        for (var i = 1; i < lines.Length; i++)
        {
            if (string.IsNullOrWhiteSpace(lines[i])) continue;
            var values = SplitCsvLine(lines[i]);
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var j = 0; j < headers.Length && j < values.Length; j++)
                row[headers[j]] = values[j];
            result.Add(row);
        }

        return result;
    }

    private static string[] SplitCsvLine(string line)
    {
        var parts = new List<string>();
        var inQuote = false;
        var current = new System.Text.StringBuilder();

        foreach (var ch in line)
        {
            if (ch == '"')
            {
                inQuote = !inQuote;
            }
            else if (ch == ',' && !inQuote)
            {
                parts.Add(current.ToString().Trim());
                current.Clear();
            }
            else
            {
                current.Append(ch);
            }
        }
        parts.Add(current.ToString().Trim());
        return parts.ToArray();
    }

    // ── Public accessors ──

    public List<Dictionary<string, string>> GetSupporterPredictions() => _supporterPredictions;
    public List<Dictionary<string, string>> GetBestPostingTimes() => _bestPostingTimes;
    public List<Dictionary<string, string>> GetReintegrationFactors() => _reintegrationCausal;
    public List<Dictionary<string, string>> GetRiskPredictions() => _riskPredictions;

    /// <summary>Maps a raw boost budget amount to its bin label using loaded thresholds.</summary>
    public string ComputeBoostBin(decimal amount)
    {
        if (amount <= 0m) return "none";
        if (amount <= _boostBinQ1) return "low";
        if (amount <= _boostBinQ3) return "medium";
        return "high";
    }

    public List<Dictionary<string, string>> LookupSocialPredictions(
        string? platform, string? postType, string? mediaType,
        string? contentTopic, string? sentimentTone, string? callToActionType,
        string? hasCallToAction = null, string? featuresResidentStory = null,
        string? isBosted = null, decimal? boostBudgetPhp = null)
    {
        var boostBin = boostBudgetPhp.HasValue ? ComputeBoostBin(boostBudgetPhp.Value) : null;

        // Filter chain ordered by priority (most → least important)
        var filters = new List<(string column, string value)>();
        if (!string.IsNullOrWhiteSpace(platform))               filters.Add(("platform", platform));
        if (!string.IsNullOrWhiteSpace(postType))               filters.Add(("post_type", postType));
        if (!string.IsNullOrWhiteSpace(mediaType))              filters.Add(("media_type", mediaType));
        if (!string.IsNullOrWhiteSpace(contentTopic))           filters.Add(("content_topic", contentTopic));
        if (!string.IsNullOrWhiteSpace(sentimentTone))          filters.Add(("sentiment_tone", sentimentTone));
        if (!string.IsNullOrWhiteSpace(callToActionType))       filters.Add(("call_to_action_type", callToActionType));
        if (!string.IsNullOrWhiteSpace(hasCallToAction))        filters.Add(("has_call_to_action", hasCallToAction));
        if (!string.IsNullOrWhiteSpace(isBosted))               filters.Add(("is_boosted", isBosted));
        if (!string.IsNullOrWhiteSpace(featuresResidentStory))  filters.Add(("features_resident_story", featuresResidentStory));
        if (!string.IsNullOrWhiteSpace(boostBin))               filters.Add(("boost_budget_php_bin", boostBin));

        // Progressive relaxation: try all filters, drop from the end until results found
        for (var drop = 0; drop <= filters.Count; drop++)
        {
            var active = filters.Take(filters.Count - drop);
            var results = _socialPostPredictions.AsEnumerable();
            foreach (var (column, value) in active)
                results = results.Where(r => r.GetValueOrDefault(column, "") == value);

            var list = results.Take(100).ToList();
            if (list.Count > 0) return list;
        }

        return [];
    }

    public List<Dictionary<string, string>> LookupBestPostingTimes(
        string? platform, string? postType, string? mediaType,
        string? contentTopic, string? sentimentTone, string? callToActionType,
        string? hasCallToAction = null, string? featuresResidentStory = null,
        string? isBosted = null, decimal? boostBudgetPhp = null)
    {
        var boostBin = boostBudgetPhp.HasValue ? ComputeBoostBin(boostBudgetPhp.Value) : null;

        var filters = new List<(string column, string value)>();
        if (!string.IsNullOrWhiteSpace(platform))               filters.Add(("platform", platform));
        if (!string.IsNullOrWhiteSpace(postType))               filters.Add(("post_type", postType));
        if (!string.IsNullOrWhiteSpace(mediaType))              filters.Add(("media_type", mediaType));
        if (!string.IsNullOrWhiteSpace(contentTopic))           filters.Add(("content_topic", contentTopic));
        if (!string.IsNullOrWhiteSpace(sentimentTone))          filters.Add(("sentiment_tone", sentimentTone));
        if (!string.IsNullOrWhiteSpace(callToActionType))       filters.Add(("call_to_action_type", callToActionType));
        if (!string.IsNullOrWhiteSpace(hasCallToAction))        filters.Add(("has_call_to_action", hasCallToAction));
        if (!string.IsNullOrWhiteSpace(isBosted))               filters.Add(("is_boosted", isBosted));
        if (!string.IsNullOrWhiteSpace(featuresResidentStory))  filters.Add(("features_resident_story", featuresResidentStory));
        if (!string.IsNullOrWhiteSpace(boostBin))               filters.Add(("boost_budget_php_bin", boostBin));

        for (var drop = 0; drop <= filters.Count; drop++)
        {
            var active = filters.Take(filters.Count - drop);
            var results = _bestPostingTimes.AsEnumerable();
            foreach (var (column, value) in active)
                results = results.Where(r => r.GetValueOrDefault(column, "") == value);

            // Deduplicate by (day_of_week, post_hour): keep the row with the highest
            // predicted value so each unique time slot appears only once.
            var deduped = results
                .GroupBy(r => (r.GetValueOrDefault("day_of_week", ""), r.GetValueOrDefault("post_hour", "")))
                .Select(g => g.OrderByDescending(r =>
                    double.TryParse(r.GetValueOrDefault("predicted_estimated_donation_value_php", "0"), out var v) ? v : 0)
                    .First())
                .OrderByDescending(r =>
                    double.TryParse(r.GetValueOrDefault("predicted_estimated_donation_value_php", "0"), out var v) ? v : 0)
                .Take(5)
                .ToList();

            if (deduped.Count == 0) continue;

            // Re-rank 1..N after dedup so the frontend always gets clean 1-5 ranks
            for (var i = 0; i < deduped.Count; i++)
            {
                deduped[i] = new Dictionary<string, string>(deduped[i])
                {
                    ["rank"] = (i + 1).ToString()
                };
            }
            return deduped;
        }

        return [];
    }

    private void LoadBoostThresholds()
    {
        var path = Path.Combine(_modelsPath, "boost_bin_thresholds.json");
        if (!File.Exists(path))
        {
            _logger.LogWarning("boost_bin_thresholds.json not found at {Path}. Boost-bin filtering disabled.", path);
            return;
        }

        try
        {
            var json = File.ReadAllText(path);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.TryGetProperty("q1", out var q1El))
                _boostBinQ1 = (decimal)q1El.GetDouble();
            if (root.TryGetProperty("q3", out var q3El))
                _boostBinQ3 = (decimal)q3El.GetDouble();
            _logger.LogInformation("Boost bin thresholds loaded: Q1={Q1}, Q3={Q3}", _boostBinQ1, _boostBinQ3);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load boost_bin_thresholds.json");
        }
    }

    public void Dispose()
    {
        _watcher?.Dispose();
    }
}
