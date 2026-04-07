using System.Collections.Concurrent;
using System.Globalization;

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

    public List<Dictionary<string, string>> LookupSocialPredictions(
        string? platform, string? postType, string? mediaType,
        string? contentTopic, string? sentimentTone, string? callToActionType)
    {
        // Build filter list ordered by priority (most → least important)
        var filters = new List<(string column, string value)>();
        if (!string.IsNullOrWhiteSpace(platform)) filters.Add(("platform", platform));
        if (!string.IsNullOrWhiteSpace(postType)) filters.Add(("post_type", postType));
        if (!string.IsNullOrWhiteSpace(mediaType)) filters.Add(("media_type", mediaType));
        if (!string.IsNullOrWhiteSpace(contentTopic)) filters.Add(("content_topic", contentTopic));
        if (!string.IsNullOrWhiteSpace(sentimentTone)) filters.Add(("sentiment_tone", sentimentTone));
        if (!string.IsNullOrWhiteSpace(callToActionType)) filters.Add(("call_to_action_type", callToActionType));

        // Progressive relaxation: try all filters, then drop from the end until results found
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

    public void Dispose()
    {
        _watcher.Dispose();
        GC.SuppressFinalize(this);
    }
}
