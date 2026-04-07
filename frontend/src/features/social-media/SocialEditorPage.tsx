import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Clock, CalendarCheck, RotateCcw, TrendingUp, Heart, Eye, Users, Share2, DollarSign } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import { useEditorStore } from '../../stores/editorStore';
import { useDebounce } from '../../hooks/useDebounce';

/* ── Types ──────────────────────────────────────────────────── */

interface AiCommand {
  action: string;
  value: string;
}

interface AiChatResponse {
  text: string;
  commands: AiCommand[];
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  commands?: AiCommand[];
}

interface PredictionResult {
  predictedDonationReferrals: number;
  predictedEstimatedDonationValuePhp: number;
  predictedEngagementRate: number;
  predictedForwards: number;
  predictedProfileVisits: number;
  predictedImpressions: number;
}

interface TimeSlot {
  dayOfWeek: string;
  postHour: number;
  predictedEstimatedDonationValuePhp: number;
  rank: number;
}

/* ── Constants ──────────────────────────────────────────────── */

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Twitter', 'WhatsApp'] as const;
const POST_TYPES = ['FundraisingAppeal', 'EducationalContent', 'EventPromotion', 'ThankYou', 'StoryHighlight'] as const;
const MEDIA_TYPES = ['Photo', 'Video', 'Carousel', 'Text', 'Reel'] as const;
const CTA_TYPES = ['DonateNow', 'LearnMore', 'ShareStory', 'SignUp', ''] as const;
const CTA_LABELS: Record<string, string> = { DonateNow: 'Donate Now', LearnMore: 'Learn More', ShareStory: 'Share Story', SignUp: 'Sign Up', '': 'None' };
const CONTENT_TOPICS = ['Education', 'Health', 'Reintegration', 'CampaignLaunch', 'Gratitude', 'SafehouseLife', 'AwarenessRaising', 'DonorImpact', 'EventRecap'] as const;
const SENTIMENT_TONES = ['Grateful', 'Celebratory', 'Emotional', 'Urgent', 'Hopeful', 'Informative'] as const;

const SELECT_CLASS =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/* ── Sub-Components ─────────────────────────────────────────── */

function SelectField({ label, value, onChange, options, labelMap }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-navy dark:text-white">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{labelMap?.[opt] ?? opt}</option>
        ))}
      </select>
    </div>
  );
}

function PredictionCard({ label, value, icon: Icon, suffix, loading }: {
  label: string;
  value: number | null;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  suffix?: string;
  loading: boolean;
}) {
  const formatted = (() => {
    if (value === null) return '';
    if (suffix === '%') return `${value.toFixed(2)}%`;
    if (suffix === 'PHP') return `${value.toLocaleString()} PHP`;
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-slate-navy/10 bg-white p-3 dark:border-white/10 dark:bg-slate-navy/60"
    >
      <div className="flex items-center gap-2 text-warm-gray">
        <Icon size={14} className="shrink-0" />
        <span className="text-xs">{label}</span>
      </div>
      {loading || value === null ? (
        <div className="mt-1.5 h-5 w-16 animate-pulse rounded bg-slate-navy/10 dark:bg-white/10" />
      ) : (
        <motion.p
          key={value}
          initial={{ opacity: 0.5, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1 text-lg font-bold text-slate-navy dark:text-white"
        >
          {formatted}
        </motion.p>
      )}
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function SocialEditorPage() {
  const store = useEditorStore();
  const [postType, setPostType] = useState('FundraisingAppeal');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [goldenSlots, setGoldenSlots] = useState<TimeSlot[]>([]);
  const [goldenLoading, setGoldenLoading] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Debounced prediction state ───────────────────────────── */

  const debouncedPlatform = useDebounce(store.platform, 1000);
  const debouncedMediaType = useDebounce(store.mediaType, 1000);
  const debouncedCtaType = useDebounce(store.ctaType, 1000);
  const debouncedContentTopic = useDebounce(store.contentTopic, 1000);
  const debouncedSentimentTone = useDebounce(store.sentimentTone, 1000);
  const debouncedCaptionLength = useDebounce(store.captionLength, 1000);
  const debouncedScheduledDay = useDebounce(store.scheduledDay, 1000);
  const debouncedScheduledHour = useDebounce(store.scheduledHour, 1000);
  const debouncedPostType = useDebounce(postType, 1000);

  /* ── Fetch predictions on debounced change ────────────────── */

  const fetchPredictions = useCallback(async () => {
    setPredictionsLoading(true);
    try {
      const resp = await api.post<{ items: PredictionResult[] }>('/api/predictions/ml/social-lookup', {
        platform: debouncedPlatform,
        postType: debouncedPostType,
        mediaType: debouncedMediaType,
        contentTopic: debouncedContentTopic,
        sentimentTone: debouncedSentimentTone,
        callToActionType: debouncedCtaType,
        captionLength: debouncedCaptionLength,
        postHour: debouncedScheduledHour ?? 12,
        dayOfWeek: debouncedScheduledDay ?? 'Monday',
      });
      const result = resp.items ?? [];
      if (result.length > 0) {
        setPredictions(result[0]);
      }
    } catch {
      /* keep previous predictions on error */
    } finally {
      setPredictionsLoading(false);
    }
  }, [debouncedPlatform, debouncedPostType, debouncedMediaType, debouncedCtaType, debouncedContentTopic, debouncedSentimentTone, debouncedCaptionLength, debouncedScheduledDay, debouncedScheduledHour]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  /* ── Fetch golden window ──────────────────────────────────── */

  const fetchGoldenWindow = useCallback(async () => {
    setGoldenLoading(true);
    try {
      const resp = await api.get<{ items: TimeSlot[] }>('/api/predictions/ml/best-posting-times');
      setGoldenSlots((resp.items ?? []).slice(0, 15));
    } catch {
      /* keep previous on error */
    } finally {
      setGoldenLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoldenWindow();
  }, [fetchGoldenWindow]);

  /* ── Chat scroll ──────────────────────────────────────────── */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /* ── AI Chat send ─────────────────────────────────────────── */

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMsg = { role: 'user', content: trimmed };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const editorState = {
        platform: store.platform,
        headline: store.headline,
        body: store.body,
        mediaType: store.mediaType,
        ctaType: store.ctaType,
        contentTopic: store.contentTopic,
        sentimentTone: store.sentimentTone,
        captionLength: store.captionLength,
        hashtags: store.hashtags,
      };

      const conversationHistory = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.post<AiChatResponse>('/api/ai/chat', {
        message: trimmed,
        editorState,
        conversationHistory,
      });

      const aiMsg: ChatMsg = {
        role: 'assistant',
        content: response.text,
        commands: response.commands,
      };
      setChatMessages((prev) => [...prev, aiMsg]);

      // Apply commands to editor
      if (response.commands && response.commands.length > 0) {
        for (const cmd of response.commands) {
          store.applyCommand(cmd);
          setHighlightedField(cmd.action);
        }
        setAppliedNotice(true);
        setTimeout(() => setAppliedNotice(false), 3000);
        setTimeout(() => setHighlightedField(null), 2000);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ── Helpers ──────────────────────────────────────────────── */

  const fieldHighlightClass = (actions: string[]) =>
    highlightedField && actions.includes(highlightedField)
      ? 'ring-2 ring-golden-honey rounded-lg transition-all duration-500'
      : '';

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div>
      <PageHeader
        title="Social Media Editor"
        subtitle="AI-powered content creation and scheduling"
        action={
          <Button variant="ghost" size="sm" onClick={store.resetEditor}>
            <RotateCcw size={16} />
            Reset
          </Button>
        }
      />

      {/* Applied notice */}
      <AnimatePresence>
        {appliedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-sage-green/20 px-4 py-2 text-sm font-medium text-sage-green"
          >
            <Sparkles size={16} />
            AI applied changes to your editor
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ═══ LEFT PANEL: Editor ═══════════════════════════════ */}
        <Card className="space-y-5">
          {/* Platform Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-navy dark:text-white">
              Platform
            </label>
            <div className={`flex flex-wrap gap-2 ${fieldHighlightClass(['changePlatform'])}`}>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => store.updateField('platform', p)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    store.platform === p
                      ? 'bg-golden-honey text-slate-navy'
                      : 'bg-slate-navy/5 text-warm-gray hover:bg-slate-navy/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Post Type */}
          <SelectField
            label="Post Type"
            value={postType}
            onChange={setPostType}
            options={POST_TYPES}
          />

          {/* Media Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-navy dark:text-white">
              Media Type
            </label>
            <div className={`flex flex-wrap gap-2 ${fieldHighlightClass(['setMediaType'])}`}>
              {MEDIA_TYPES.map((m) => (
                <button
                  key={m}
                  onClick={() => store.updateField('mediaType', m)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    store.mediaType === m
                      ? 'bg-sky-blue text-slate-navy'
                      : 'bg-slate-navy/5 text-warm-gray hover:bg-slate-navy/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Headline */}
          <div className={fieldHighlightClass(['updateHeadline'])}>
            <Input
              label="Headline"
              placeholder="Enter your post headline..."
              value={store.headline}
              onChange={(e) => store.updateField('headline', e.target.value)}
            />
          </div>

          {/* Caption / Body */}
          <div className={`flex flex-col gap-1 ${fieldHighlightClass(['updateBody'])}`}>
            <label className="text-sm font-medium text-slate-navy dark:text-white">Caption</label>
            <textarea
              rows={4}
              placeholder="Write your caption..."
              value={store.body}
              onChange={(e) => store.updateField('body', e.target.value)}
              className="w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
            />
            <p className="text-right text-xs text-warm-gray">{store.captionLength} characters</p>
          </div>

          {/* CTA Type */}
          <div className={fieldHighlightClass(['setCtaType'])}>
            <SelectField
              label="Call to Action"
              value={store.ctaType}
              onChange={(v) => store.updateField('ctaType', v)}
              options={CTA_TYPES}
              labelMap={CTA_LABELS}
            />
          </div>

          {/* Content Topic */}
          <div className={fieldHighlightClass(['setContentTopic'])}>
            <SelectField
              label="Content Topic"
              value={store.contentTopic}
              onChange={(v) => store.updateField('contentTopic', v)}
              options={CONTENT_TOPICS}
            />
          </div>

          {/* Sentiment Tone */}
          <div className={fieldHighlightClass(['setSentimentTone'])}>
            <SelectField
              label="Sentiment Tone"
              value={store.sentimentTone}
              onChange={(v) => store.updateField('sentimentTone', v)}
              options={SENTIMENT_TONES}
            />
          </div>

          {/* Hashtags */}
          <Input
            label="Hashtags"
            placeholder="#NewDawn #EndTrafficking..."
            value={store.hashtags}
            onChange={(e) => store.updateField('hashtags', e.target.value)}
          />
        </Card>

        {/* ═══ RIGHT PANEL: AI Chat + Predictions ══════════════ */}
        <div className="space-y-6">
          {/* ── AI Chat ──────────────────────────────────────── */}
          <Card className="flex h-[420px] flex-col">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-golden-honey" />
              <h2 className="font-heading text-lg font-semibold text-slate-navy dark:text-white">
                AI Assistant
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {chatMessages.length === 0 && (
                <div className="flex h-full items-center justify-center text-center text-sm text-warm-gray">
                  <div>
                    <Sparkles size={28} className="mx-auto mb-2 text-golden-honey/50" />
                    <p>Ask me to write a headline, draft a caption,</p>
                    <p>suggest improvements, or optimize your post.</p>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-golden-honey text-slate-navy'
                        : 'bg-sky-blue/10 text-slate-navy dark:text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.commands && msg.commands.length > 0 && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium opacity-70">
                        <Sparkles size={10} />
                        {msg.commands.length} change{msg.commands.length > 1 ? 's' : ''} applied
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-sky-blue/10 px-4 py-3">
                    <Spinner size="sm" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Ask the AI assistant..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
              />
              <Button size="sm" onClick={handleSendChat} loading={chatLoading} disabled={!chatInput.trim()}>
                <Send size={16} />
              </Button>
            </div>
          </Card>

          {/* ── Predictions ─────────────────────────────────── */}
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-sky-blue" />
              <h2 className="font-heading text-lg font-semibold text-slate-navy dark:text-white">
                Predicted Performance
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <PredictionCard
                label="Donation Referrals"
                value={predictions?.predictedDonationReferrals ?? null}
                icon={Heart}
                loading={predictionsLoading}
              />
              <PredictionCard
                label="Est. Donation Value"
                value={predictions?.predictedEstimatedDonationValuePhp ?? null}
                icon={DollarSign}
                suffix="PHP"
                loading={predictionsLoading}
              />
              <PredictionCard
                label="Engagement Rate"
                value={predictions?.predictedEngagementRate ?? null}
                icon={TrendingUp}
                suffix="%"
                loading={predictionsLoading}
              />
              <PredictionCard
                label="Forward Count"
                value={predictions?.predictedForwards ?? null}
                icon={Share2}
                loading={predictionsLoading}
              />
              <PredictionCard
                label="Profile Visits"
                value={predictions?.predictedProfileVisits ?? null}
                icon={Eye}
                loading={predictionsLoading}
              />
              <PredictionCard
                label="Impressions"
                value={predictions?.predictedImpressions ?? null}
                icon={Users}
                loading={predictionsLoading}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* ═══ BOTTOM BAR: Golden Window ═══════════════════════════ */}
      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-golden-honey" />
            <h2 className="font-heading text-lg font-semibold text-slate-navy dark:text-white">
              Best Posting Times
            </h2>
          </div>
          {store.scheduledDay && store.scheduledHour !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-sage-green/15 px-3 py-1.5 text-sm font-medium text-sage-green">
              <CalendarCheck size={16} />
              Scheduled: {store.scheduledDay} at {formatHour(store.scheduledHour)}
            </div>
          )}
        </div>

        {goldenLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : goldenSlots.length === 0 ? (
          <p className="py-4 text-center text-sm text-warm-gray">
            No scheduling data available yet. Adjust your post settings above.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {goldenSlots.map((slot, i) => {
              const isSelected =
                store.scheduledDay === slot.dayOfWeek && store.scheduledHour === slot.postHour;
              const isTop3 = i < 3;

              return (
                <motion.button
                  key={`${slot.dayOfWeek}-${slot.postHour}`}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    store.updateField('scheduledDay', slot.dayOfWeek);
                    store.updateField('scheduledHour', slot.postHour);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'ring-2 ring-slate-navy bg-golden-honey text-slate-navy dark:ring-white'
                      : isTop3
                        ? 'bg-golden-honey/80 text-slate-navy hover:bg-golden-honey'
                        : 'bg-sky-blue/20 text-slate-navy hover:bg-sky-blue/30 dark:text-white'
                  }`}
                >
                  <span className="font-semibold">{slot.dayOfWeek.slice(0, 3)}</span>{' '}
                  {formatHour(slot.postHour)}
                  <span className="ml-1.5 text-xs opacity-70">
                    {Math.round(slot.predictedEstimatedDonationValuePhp).toLocaleString()} PHP
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
