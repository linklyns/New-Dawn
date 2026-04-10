import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart2, CalendarClock, ImagePlus, MessageSquareText, RefreshCcw, Save, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber, formatLocalizedPercent, resolveUserPreferences } from '../../lib/locale';
import { scrollPageToTop } from '../../lib/scroll';
import { normalizeRichTextHtml, richTextToPlainText } from '../../lib/richText';
import type { PagedResult } from '../../types/api';
import type { BestPostingTime, MlSocialPostPrediction } from '../../types/predictions';
import { PREDICTION_FEATURE_DESCRIPTIONS } from '../../types/predictions';
import type { SocialMediaDraft, SocialMediaDraftChatMessage, SocialMediaDraftSummary } from '../../types/models';
import { SocialDraftPreview } from './SocialDraftPreview';

type Stage = 'brief' | 'compose';

interface DraftAiState {
  title: string;
  platform: string;
  postType: string;
  mediaType: string;
  callToActionType: string;
  contentTopic: string;
  sentimentTone: string;
  hashtags: string;
  audience: string;
  campaignName: string;
  additionalInstructions: string;
  headline: string;
  body: string;
  ctaText: string;
  websiteUrl: string;
}

interface SocialDraftAiResponse {
  text: string;
  draft: DraftAiState;
}

interface PendingUpload {
  tempId: string;
  file: File;
  previewUrl?: string;
  mediaKind: string;
}

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Twitter', 'WhatsApp'] as const;
const POST_TYPES = ['FundraisingAppeal', 'EducationalContent', 'EventPromotion', 'ThankYou', 'StoryHighlight'] as const;
const MEDIA_TYPES = ['Photo', 'Video', 'Carousel', 'Text', 'Reel'] as const;
const PLATFORM_LABELS: Record<string, string> = {
  Twitter: 'X (previously Twitter)',
  X: 'X (previously Twitter)',
};
const CTA_TYPES = ['', 'DonateNow', 'LearnMore', 'ShareStory', 'SignUp'] as const;
const OPTION_LABELS: Record<string, string> = {
  '': 'No CTA yet',
  DonateNow: 'Donate Now',
  LearnMore: 'Learn More',
  ShareStory: 'Share Story',
  SignUp: 'Sign Up',
  ...PLATFORM_LABELS,
};
const CONTENT_TOPICS = ['Education', 'Health', 'Reintegration', 'CampaignLaunch', 'Gratitude', 'SafehouseLife', 'AwarenessRaising', 'DonorImpact', 'EventRecap'] as const;
const SENTIMENT_TONES = ['Grateful', 'Celebratory', 'Emotional', 'Urgent', 'Hopeful', 'Informative'] as const;
const SOCIAL_EDITOR_SELECTED_DRAFT_KEY = 'social-editor-selected-draft-id';

const briefSchema = z.object({
  title: z.string().trim().min(2, 'Give this draft a title so you can find it later.'),
  platform: z.enum(PLATFORMS),
  postType: z.enum(POST_TYPES),
  mediaType: z.enum(MEDIA_TYPES),
  callToActionType: z.enum(CTA_TYPES),
  contentTopic: z.enum(CONTENT_TOPICS),
  sentimentTone: z.enum(SENTIMENT_TONES),
  hashtags: z.string().max(280),
  audience: z.string().trim().min(2, 'Add a short audience description.'),
  campaignName: z.string().max(120),
  additionalInstructions: z.string().max(2000),
});

type BriefValues = z.infer<typeof briefSchema>;

function createEmptyDraft(title = 'Untitled draft'): SocialMediaDraft {
  return {
    draftId: 0,
    title,
    stage: 'brief',
    status: 'draft',
    platform: 'Instagram',
    postType: 'FundraisingAppeal',
    mediaType: 'Photo',
    callToActionType: '',
    contentTopic: 'Education',
    sentimentTone: 'Informative',
    hashtags: '',
    audience: '',
    campaignName: '',
    additionalInstructions: '',
    headline: '',
    body: '',
    ctaText: '',
    websiteUrl: 'new-dawn-virid.vercel.app',
    scheduledDay: null,
    scheduledHour: null,
    chatHistory: [],
    mediaItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function toBriefValues(draft: SocialMediaDraft): BriefValues {
  return {
    title: draft.title,
    platform: draft.platform as BriefValues['platform'],
    postType: draft.postType as BriefValues['postType'],
    mediaType: draft.mediaType as BriefValues['mediaType'],
    callToActionType: (draft.callToActionType || '') as BriefValues['callToActionType'],
    contentTopic: draft.contentTopic as BriefValues['contentTopic'],
    sentimentTone: draft.sentimentTone as BriefValues['sentimentTone'],
    hashtags: draft.hashtags,
    audience: draft.audience,
    campaignName: draft.campaignName,
    additionalInstructions: draft.additionalInstructions,
  };
}

function toDraftAiState(draft: SocialMediaDraft): DraftAiState {
  return {
    title: draft.title,
    platform: draft.platform,
    postType: draft.postType,
    mediaType: draft.mediaType,
    callToActionType: draft.callToActionType,
    contentTopic: draft.contentTopic,
    sentimentTone: draft.sentimentTone,
    hashtags: draft.hashtags,
    audience: draft.audience,
    campaignName: draft.campaignName,
    additionalInstructions: draft.additionalInstructions,
    headline: draft.headline,
    body: richTextToPlainText(draft.body),
    ctaText: draft.ctaText,
    websiteUrl: draft.websiteUrl,
  };
}

function normalizeDraft(draft: SocialMediaDraft): SocialMediaDraft {
  return {
    ...draft,
    body: normalizeRichTextHtml(draft.body),
  };
}

function mergeAiIntoDraft(base: SocialMediaDraft, aiDraft: DraftAiState): SocialMediaDraft {
  return {
    ...base,
    ...aiDraft,
    body: normalizeRichTextHtml(aiDraft.body),
    stage: 'compose',
    updatedAt: new Date().toISOString(),
  };
}

function buildUpsertPayload(draft: SocialMediaDraft) {
  return {
    title: draft.title,
    stage: draft.stage,
    platform: draft.platform,
    postType: draft.postType,
    mediaType: draft.mediaType,
    callToActionType: draft.callToActionType,
    contentTopic: draft.contentTopic,
    sentimentTone: draft.sentimentTone,
    hashtags: draft.hashtags,
    audience: draft.audience,
    campaignName: draft.campaignName,
    additionalInstructions: draft.additionalInstructions,
    headline: draft.headline,
    body: draft.body,
    ctaText: draft.ctaText,
    websiteUrl: draft.websiteUrl,
    scheduledDay: draft.scheduledDay,
    scheduledHour: draft.scheduledHour,
    chatHistory: draft.chatHistory,
  };
}

function toDraftSummary(draft: SocialMediaDraft): SocialMediaDraftSummary {
  return {
    draftId: draft.draftId,
    title: draft.title,
    stage: draft.stage,
    status: draft.status,
    platform: draft.platform,
    mediaType: draft.mediaType,
    contentTopic: draft.contentTopic,
    sentimentTone: draft.sentimentTone,
    updatedAt: draft.updatedAt,
    mediaCount: draft.mediaItems.length,
  };
}

function formatUpdatedAt(value: string): string {
  return formatLocalizedDateTime(value);
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function needsVisualMedia(mediaType: string): boolean {
  return mediaType === 'Photo' || mediaType === 'Video' || mediaType === 'Carousel' || mediaType === 'Reel';
}

function SelectField({
  label,
  value,
  options,
  onChange,
  helper,
  getOptionLabel,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  helper?: string;
  getOptionLabel?: (value: string) => string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-medium text-slate-navy dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-2xl border border-slate-navy/15 bg-white px-4 py-3 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/30 dark:border-white/10 dark:bg-slate-navy dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>{getOptionLabel ? getOptionLabel(option) : OPTION_LABELS[option] ?? option}</option>
        ))}
      </select>
      {helper && <span className="text-xs text-warm-gray">{helper}</span>}
    </label>
  );
}

function StagePill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${active ? 'bg-golden-honey text-slate-navy' : 'bg-slate-navy/5 text-warm-gray dark:bg-white/10 dark:text-white/60'}`}>
      {children}
    </span>
  );
}

export function SocialEditorPage() {
  const { t } = useTranslation();
  const preferences = resolveUserPreferences(useAuthStore((s) => s.user));
  const queryClient = useQueryClient();
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedDraftId = window.sessionStorage.getItem(SOCIAL_EDITOR_SELECTED_DRAFT_KEY);
    if (!storedDraftId) {
      return null;
    }

    const parsedDraftId = Number(storedDraftId);
    return Number.isInteger(parsedDraftId) && parsedDraftId > 0 ? parsedDraftId : null;
  });
  const [activeDraft, setActiveDraft] = useState<SocialMediaDraft>(() => createEmptyDraft(t('social.untitledDraft', { defaultValue: 'Untitled draft' })));
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [persistedPreviewUrls, setPersistedPreviewUrls] = useState<Record<number, string>>({});
  const [prediction, setPrediction] = useState<MlSocialPostPrediction | null>(null);
  const [bestTimes, setBestTimes] = useState<BestPostingTime[]>([]);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatIsThinking, setChatIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [timesLoading, setTimesLoading] = useState(false);
  const autoSaveSkipRef = useRef(true);
  const predictorRefreshKeyRef = useRef<string | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const getPlatformLabel = useCallback((platform: string) => {
    const key = {
      Facebook: 'social.facebook',
      Instagram: 'social.instagram',
      Twitter: 'social.twitter',
      X: 'social.xTwitter',
      YouTube: 'social.youtube',
      TikTok: 'social.tiktok',
      LinkedIn: 'social.linkedin',
      WhatsApp: 'social.whatsapp',
    }[platform];

    return key ? t(key, { defaultValue: PLATFORM_LABELS[platform] ?? platform }) : PLATFORM_LABELS[platform] ?? platform;
  }, [t]);

  const getPostTypeLabel = useCallback((postType: string) => {
    const key = {
      FundraisingAppeal: 'social.fundraisingAppeal',
      EducationalContent: 'social.educationalContent',
      EventPromotion: 'social.eventPromotion',
      ThankYou: 'social.thankYou',
      StoryHighlight: 'social.storyHighlight',
    }[postType];

    return key ? t(key, { defaultValue: postType }) : postType;
  }, [t]);

  const getMediaTypeLabel = useCallback((mediaType: string) => {
    const key = {
      Photo: 'social.photo',
      Video: 'social.video',
      Carousel: 'social.carousel',
      Text: 'social.text',
      Reel: 'social.reel',
    }[mediaType];

    return key ? t(key, { defaultValue: mediaType }) : mediaType;
  }, [t]);

  const getCallToActionLabel = useCallback((value: string) => {
    const key = {
      '': 'social.noCta',
      DonateNow: 'social.donateNow',
      LearnMore: 'social.learnMore',
      ShareStory: 'social.shareStory',
      SignUp: 'social.signUp',
    }[value];

    return key ? t(key, { defaultValue: OPTION_LABELS[value] ?? value }) : OPTION_LABELS[value] ?? value;
  }, [t]);

  const getContentTopicLabel = useCallback((value: string) => {
    const key = {
      Education: 'social.topicEducation',
      Health: 'social.topicHealth',
      Reintegration: 'social.topicReintegration',
      CampaignLaunch: 'social.topicCampaignLaunch',
      Gratitude: 'social.topicGratitude',
      SafehouseLife: 'social.topicSafehouseLife',
      AwarenessRaising: 'social.topicAwareness',
      DonorImpact: 'social.topicDonorImpact',
      EventRecap: 'social.topicEventRecap',
    }[value];

    return key ? t(key, { defaultValue: value }) : value;
  }, [t]);

  const getSentimentLabel = useCallback((value: string) => {
    const key = {
      Grateful: 'social.grateful',
      Celebratory: 'social.celebratory',
      Emotional: 'social.emotional',
      Urgent: 'social.urgent',
      Hopeful: 'social.hopeful',
      Informative: 'social.informative',
    }[value];

    return key ? t(key, { defaultValue: value }) : value;
  }, [t]);

  const getOptionLabel = useCallback((value: string) => {
    if (PLATFORMS.includes(value as typeof PLATFORMS[number])) {
      return getPlatformLabel(value);
    }

    if (POST_TYPES.includes(value as typeof POST_TYPES[number])) {
      return getPostTypeLabel(value);
    }

    if (MEDIA_TYPES.includes(value as typeof MEDIA_TYPES[number])) {
      return getMediaTypeLabel(value);
    }

    if (CTA_TYPES.includes(value as typeof CTA_TYPES[number])) {
      return getCallToActionLabel(value);
    }

    if (CONTENT_TOPICS.includes(value as typeof CONTENT_TOPICS[number])) {
      return getContentTopicLabel(value);
    }

    if (SENTIMENT_TONES.includes(value as typeof SENTIMENT_TONES[number])) {
      return getSentimentLabel(value);
    }

    return OPTION_LABELS[value] ?? value;
  }, [getCallToActionLabel, getContentTopicLabel, getMediaTypeLabel, getPlatformLabel, getPostTypeLabel, getSentimentLabel]);

  const form = useForm<BriefValues>({
    resolver: zodResolver(briefSchema),
    defaultValues: toBriefValues(activeDraft),
  });

  const draftsQuery = useQuery({
    queryKey: ['social-media-drafts'],
    queryFn: () => api.get<PagedResult<SocialMediaDraftSummary>>('/api/social-media-drafts?page=1&pageSize=50'),
  });

  const selectedDraftQuery = useQuery({
    queryKey: ['social-media-drafts', selectedDraftId],
    queryFn: () => api.get<SocialMediaDraft>(`/api/social-media-drafts/${selectedDraftId}`),
    enabled: selectedDraftId !== null,
  });

  const createDraftMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildUpsertPayload>) => api.post<SocialMediaDraft>('/api/social-media-drafts', payload),
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ draftId, payload }: { draftId: number; payload: ReturnType<typeof buildUpsertPayload> }) =>
      api.put<SocialMediaDraft>(`/api/social-media-drafts/${draftId}`, payload),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: number) => api.delete<{ success: boolean }>(`/api/social-media-drafts/${draftId}?confirm=true`),
  });

  const clearPendingUploads = useCallback(() => {
    setPendingUploads((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return [];
    });
  }, []);

  useEffect(() => {
    if (!selectedDraftQuery.data) {
      return;
    }

    const normalizedDraft = normalizeDraft(selectedDraftQuery.data);

    autoSaveSkipRef.current = true;
    setActiveDraft(normalizedDraft);
    setPrediction(null);
    setBestTimes([]);
    setChatInput('');
    clearPendingUploads();
    form.reset(toBriefValues(normalizedDraft));
  }, [clearPendingUploads, form, selectedDraftQuery.data]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (selectedDraftId && selectedDraftId > 0) {
      window.sessionStorage.setItem(SOCIAL_EDITOR_SELECTED_DRAFT_KEY, String(selectedDraftId));
      return;
    }

    window.sessionStorage.removeItem(SOCIAL_EDITOR_SELECTED_DRAFT_KEY);
  }, [selectedDraftId]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const chatContainer = chatScrollContainerRef.current;
    if (!chatContainer) {
      return;
    }

    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

    window.requestAnimationFrame(() => {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior,
      });
    });
  }, [activeDraft.chatHistory, chatIsThinking]);

  useEffect(() => {
    const mediaItems = activeDraft.mediaItems;
    if (mediaItems.length === 0) {
      setPersistedPreviewUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }

    let disposed = false;
    const createdUrls: string[] = [];

    const loadPreviews = async () => {
      const nextMap: Record<number, string> = {};

      for (const item of mediaItems) {
        try {
          const blob = await api.getBlob(`/api/social-media-drafts/media/${item.mediaId}`);
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          nextMap[item.mediaId] = url;
        } catch {
          // Keep preview empty if the file can't be fetched.
        }
      }

      if (disposed) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setPersistedPreviewUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return nextMap;
      });
    };

    void loadPreviews();

    return () => {
      disposed = true;
    };
  }, [activeDraft.mediaItems]);

  const persistDraft = useCallback(async (
    draft: SocialMediaDraft,
    options: { uploadPending: boolean; silent?: boolean },
  ) => {
    const payload = buildUpsertPayload(draft);
    const savedDraft = draft.draftId > 0
      ? await updateDraftMutation.mutateAsync({ draftId: draft.draftId, payload })
      : await createDraftMutation.mutateAsync(payload);

    let finalDraft = savedDraft;
    if (options.uploadPending && pendingUploads.length > 0) {
      setUploading(true);
      const formData = new FormData();
      pendingUploads.forEach((item) => formData.append('files', item.file));
      finalDraft = await api.postForm<SocialMediaDraft>(`/api/social-media-drafts/${savedDraft.draftId}/attachments`, formData);
      setUploading(false);
      setPendingUploads((prev) => {
        prev.forEach((item) => {
          if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });
        return [];
      });
    }

    queryClient.setQueryData<PagedResult<SocialMediaDraftSummary> | undefined>(['social-media-drafts'], (current) => {
      if (!current) {
        return current;
      }

      const nextSummary = toDraftSummary(finalDraft);
      const existingIndex = current.items.findIndex((item) => item.draftId === nextSummary.draftId);
      const nextItems = [...current.items];

      if (existingIndex >= 0) {
        nextItems[existingIndex] = nextSummary;
      } else {
        nextItems.unshift(nextSummary);
      }

      nextItems.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

      return {
        ...current,
        items: nextItems,
        totalCount: existingIndex >= 0 ? current.totalCount : current.totalCount + 1,
      };
    });

    queryClient.setQueryData(['social-media-drafts', finalDraft.draftId], finalDraft);

    const normalizedDraft = normalizeDraft(finalDraft);

    autoSaveSkipRef.current = true;
    setSelectedDraftId(normalizedDraft.draftId);

    if (options.silent && !options.uploadPending) {
      setActiveDraft((prev) => ({
        ...prev,
        draftId: normalizedDraft.draftId,
        createdAt: normalizedDraft.createdAt,
        updatedAt: normalizedDraft.updatedAt,
        status: normalizedDraft.status,
      }));
    } else {
      setActiveDraft(normalizedDraft);
      form.reset(toBriefValues(normalizedDraft));
    }

    if (!options.silent) {
      setStatusMessage(t('social.draftSaved', { defaultValue: 'Draft saved.' }));
    }

    return finalDraft;
  }, [createDraftMutation, form, pendingUploads, queryClient, t, updateDraftMutation]);

  useEffect(() => {
    if (autoSaveSkipRef.current) {
      autoSaveSkipRef.current = false;
      return;
    }

    if (activeDraft.draftId <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft(activeDraft, { uploadPending: false, silent: true });
    }, 300000);

    return () => window.clearTimeout(timer);
  }, [activeDraft, persistDraft]);

  useEffect(() => () => {
    pendingUploads.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    Object.values(persistedPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
  }, [pendingUploads, persistedPreviewUrls]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedDraftId === null && activeDraft.draftId <= 0 && activeDraft.stage === 'brief') {
        clearPendingUploads();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeDraft.draftId, activeDraft.stage, clearPendingUploads, selectedDraftId]);

  const startNewPost = useCallback(() => {
    setSelectedDraftId(null);
    setPrediction(null);
    setBestTimes([]);
    setPerformanceError(null);
    setTimesError(null);
    setChatInput('');
    setStatusMessage(null);
    clearPendingUploads();
    autoSaveSkipRef.current = true;
    const nextDraft = createEmptyDraft(t('social.untitledDraft', { defaultValue: 'Untitled draft' }));
    setActiveDraft(nextDraft);
    form.reset(toBriefValues(nextDraft));
    scrollPageToTop();
  }, [clearPendingUploads, form, t]);

  const openDraft = useCallback((draftId: number) => {
    setSelectedDraftId(draftId);
    scrollPageToTop();
  }, []);

  const handleGenerate = form.handleSubmit(async (values) => {
    const stageOneDraft: SocialMediaDraft = {
      ...activeDraft,
      ...values,
      title: values.title.trim(),
      stage: 'brief',
    };

    autoSaveSkipRef.current = true;
    setActiveDraft(stageOneDraft);

    try {
      const response = await api.post<SocialDraftAiResponse>('/api/ai/social/generate', {
        brief: toDraftAiState(stageOneDraft),
      });

      const assistantMessage: SocialMediaDraftChatMessage = { role: 'assistant', content: response.text };
      const generatedDraft: SocialMediaDraft = {
        ...mergeAiIntoDraft(stageOneDraft, response.draft),
        chatHistory: [assistantMessage],
      };

      autoSaveSkipRef.current = true;
      setActiveDraft(generatedDraft);
      setStatusMessage(t('social.aiGeneratedDraft', { defaultValue: 'AI generated a new post draft.' }));
      setPrediction(null);
      setBestTimes([]);
      setPerformanceError(null);
      setTimesError(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : t('social.unableToGenerateDraft', { defaultValue: 'Unable to generate a draft right now.' }));
    }
  });

  const handleExplicitSave = async () => {
    const values = form.getValues();
    const draftToSave: SocialMediaDraft = currentStage === 'brief'
      ? {
        ...activeDraft,
        ...values,
        title: values.title.trim(),
      }
      : activeDraft;

    autoSaveSkipRef.current = true;
    setActiveDraft(draftToSave);
    await persistDraft(draftToSave, { uploadPending: true });
  };

  const handleRemovePersistedAttachment = async (mediaId: number) => {
    if (activeDraft.draftId <= 0) {
      return;
    }

    await api.delete<{ success: boolean }>(`/api/social-media-drafts/${activeDraft.draftId}/attachments/${mediaId}?confirm=true`);
    const refreshed = await api.get<SocialMediaDraft>(`/api/social-media-drafts/${activeDraft.draftId}`);
    autoSaveSkipRef.current = true;
    setActiveDraft(normalizeDraft(refreshed));
  };

  const handleDeleteDraft = async () => {
    if (activeDraft.draftId <= 0) {
      return;
    }

    await deleteDraftMutation.mutateAsync(activeDraft.draftId);
    setIsDeleteModalOpen(false);

    queryClient.setQueryData<PagedResult<SocialMediaDraftSummary> | undefined>(['social-media-drafts'], (current) => {
      if (!current) {
        return current;
      }

      const nextItems = current.items.filter((item) => item.draftId !== activeDraft.draftId);
      return {
        ...current,
        items: nextItems,
        totalCount: Math.max(0, current.totalCount - (current.items.length === nextItems.length ? 0 : 1)),
      };
    });

    queryClient.removeQueries({ queryKey: ['social-media-drafts', activeDraft.draftId] });
    startNewPost();
    setStatusMessage(t('social.draftDeleted', { defaultValue: 'Draft deleted.' }));
  };

  const handleUploadSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const nextItems = Array.from(files).map((file) => ({
      tempId: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined,
      mediaKind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
    }));

    setPendingUploads((prev) => [...prev, ...nextItems]);
    setStatusMessage(t('social.mediaAddedLocally', { defaultValue: 'Media added locally. Save the draft to persist it.' }));
  };

  const buildLookupPayload = () => ({
    platform: activeDraft.platform,
    postType: activeDraft.postType,
    mediaType: activeDraft.mediaType,
    contentTopic: activeDraft.contentTopic,
    sentimentTone: activeDraft.sentimentTone,
    callToActionType: activeDraft.callToActionType,
    hasCallToAction: activeDraft.callToActionType && activeDraft.callToActionType !== 'None' ? 'Yes' : 'No',
  });

  const fetchPerformance = async () => {
    setPerformanceLoading(true);
    setPerformanceError(null);
    try {
      const resp = await api.post<{ items: MlSocialPostPrediction[] }>(
        '/api/predictions/ml/social-lookup',
        buildLookupPayload(),
      );
      setPrediction(resp.items?.[0] ?? null);
    } catch (error) {
      setPerformanceError(error instanceof Error ? error.message : t('social.unableToLoadPerformancePredictions', { defaultValue: 'Unable to load performance predictions.' }));
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchBestTimes = async () => {
    setTimesLoading(true);
    setTimesError(null);
    try {
      const resp = await api.post<{ items: BestPostingTime[] }>(
        '/api/predictions/ml/best-posting-times',
        buildLookupPayload(),
      );
      const slots = resp.items?.slice(0, 5) ?? [];
      setBestTimes(slots);
      const bestSlot = slots[0];
      if (bestSlot) {
        autoSaveSkipRef.current = true;
        setActiveDraft((prev) => ({
          ...prev,
          scheduledDay: bestSlot.dayOfWeek,
          scheduledHour: bestSlot.postHour,
        }));
      }
    } catch (error) {
      setTimesError(error instanceof Error ? error.message : t('social.unableToLoadSuggestedTimes', { defaultValue: 'Unable to load suggested times.' }));
    } finally {
      setTimesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDraftQuery.data || activeDraft.stage !== 'compose' || activeDraft.draftId <= 0) {
      predictorRefreshKeyRef.current = null;
      return;
    }

    const refreshKey = String(activeDraft.draftId);
    if (predictorRefreshKeyRef.current === refreshKey) {
      return;
    }

    predictorRefreshKeyRef.current = refreshKey;
    void fetchPerformance();
    void fetchBestTimes();
  }, [activeDraft.draftId, activeDraft.stage, selectedDraftQuery.data]);

  const handleChatSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatIsThinking) {
      return;
    }

    const userMessage: SocialMediaDraftChatMessage = { role: 'user', content: trimmed };
    const nextHistory = [...activeDraft.chatHistory, userMessage];
    autoSaveSkipRef.current = true;
    setActiveDraft((prev) => ({ ...prev, chatHistory: nextHistory }));
    setChatInput('');
    setChatIsThinking(true);

    try {
      const response = await api.post<SocialDraftAiResponse>('/api/ai/social/refine', {
        message: trimmed,
        draft: toDraftAiState(activeDraft),
        conversationHistory: activeDraft.chatHistory,
      });

      const assistantMessage: SocialMediaDraftChatMessage = { role: 'assistant', content: response.text };
      autoSaveSkipRef.current = true;
      setActiveDraft((prev) => ({
        ...mergeAiIntoDraft(prev, response.draft),
        chatHistory: [...nextHistory, assistantMessage],
      }));
      setStatusMessage(t('social.aiAppliedRevision', { defaultValue: 'AI applied a new revision.' }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : t('social.unableToRefineDraft', { defaultValue: 'Unable to refine the draft right now.' }));
    } finally {
      setChatIsThinking(false);
    }
  };

  const handleChatInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleChatSend();
    }
  };

  const combinedAttachments = useMemo(() => ([
    ...activeDraft.mediaItems.map((item) => ({ ...item, previewUrl: persistedPreviewUrls[item.mediaId] })),
    ...pendingUploads.map((item, index) => ({
      mediaId: -(index + 1),
      fileName: item.file.name,
      contentType: item.file.type,
      mediaKind: item.mediaKind,
      fileSizeBytes: item.file.size,
      uploadedAt: new Date().toISOString(),
      previewUrl: item.previewUrl,
      tempId: item.tempId,
    })),
  ]), [activeDraft.mediaItems, pendingUploads, persistedPreviewUrls]);

  const draftList = draftsQuery.data?.items ?? [];
  const currentStage = activeDraft.stage as Stage;
  const performanceMetrics = useMemo(() => {
    const selectedSlot = bestTimes.find(
      (t) => t.dayOfWeek === activeDraft.scheduledDay && t.postHour === activeDraft.scheduledHour,
    );
    const isTimeAdjusted = selectedSlot != null;
    const estimatedValue = isTimeAdjusted
      ? formatLocalizedCurrency(Math.round(selectedSlot.predictedEstimatedDonationValuePhp), preferences, { maximumFractionDigits: 0 })
      : prediction
        ? formatLocalizedCurrency(Math.round(prediction.predictedEstimatedDonationValuePhp), preferences, { maximumFractionDigits: 0 })
        : '--';

    return [
      {
        label: t('social.predictedReferrals', { defaultValue: 'Predicted Referrals' }),
        value: prediction ? formatLocalizedNumber(prediction.predictedDonationReferrals, preferences, { maximumFractionDigits: 1 }) : '--',
        description: PREDICTION_FEATURE_DESCRIPTIONS.predictedDonationReferrals,
        timeAdjusted: false,
      },
      {
        label: t('social.estimatedValue', { defaultValue: 'Estimated Value' }),
        value: estimatedValue,
        description: PREDICTION_FEATURE_DESCRIPTIONS.predictedEstimatedDonationValuePhp,
        timeAdjusted: isTimeAdjusted,
      },
      {
        label: t('social.engagement', { defaultValue: 'Engagement' }),
        value: prediction ? formatLocalizedPercent(prediction.predictedEngagementRate, preferences, { maximumFractionDigits: 2 }) : '--',
        description: PREDICTION_FEATURE_DESCRIPTIONS.predictedEngagementRate,
        timeAdjusted: false,
      },
      {
        label: t('social.forwards', { defaultValue: 'Forwards' }),
        value: prediction ? formatLocalizedNumber(prediction.predictedForwards, preferences, { maximumFractionDigits: 1 }) : '--',
        description: PREDICTION_FEATURE_DESCRIPTIONS.predictedForwards,
        timeAdjusted: false,
      },
      {
        label: t('social.profileVisits', { defaultValue: 'Profile Visits' }),
        value: prediction ? formatLocalizedNumber(prediction.predictedProfileVisits, preferences, { maximumFractionDigits: 1 }) : '--',
        description: PREDICTION_FEATURE_DESCRIPTIONS.predictedProfileVisits,
        timeAdjusted: false,
      },
      {
        label: t('social.impressions'),
        value: prediction ? formatLocalizedNumber(prediction.predictedImpressions, preferences, { maximumFractionDigits: 1 }) : '--',
        description: PREDICTION_FEATURE_DESCRIPTIONS.predictedImpressions,
        timeAdjusted: false,
      },
    ];
  }, [activeDraft.scheduledDay, activeDraft.scheduledHour, bestTimes, prediction, preferences, t]);

  const savedPostsCard = (
    <Card className="flex h-full self-stretch flex-col space-y-4 p-0">
      <div className="border-b border-slate-navy/10 px-4 py-4 sm:px-5 sm:py-5 dark:border-white/10">
        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">{t('social.savedPosts', { defaultValue: 'Saved Posts' })}</p>
          <p className="mt-1 text-sm text-warm-gray">{t('social.savedPostsHelper', { defaultValue: 'Resume any saved draft and keep working with AI.' })}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 pb-4">
        <button
          type="button"
          onClick={startNewPost}
          className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${selectedDraftId === null ? 'border-golden-honey bg-golden-honey/10' : 'border-slate-navy/10 bg-sky-blue/8 hover:border-golden-honey/40 hover:bg-sky-blue/12 dark:border-white/10 dark:bg-sky-blue/10 dark:hover:bg-sky-blue/15'}`}
        >
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold text-slate-navy dark:text-white">{t('social.newPost', { defaultValue: 'New post' })}</p>
            <p className="mt-1 text-xs text-warm-gray">{t('social.startFromFreshBrief', { defaultValue: 'Start from a fresh brief' })}</p>
          </div>
        </button>

        {draftsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10"><Spinner size="lg" /></div>
        ) : draftList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-navy/15 px-4 py-8 text-center text-sm text-warm-gray dark:border-white/10 dark:text-white/60">
            {t('social.noSavedDrafts', { defaultValue: 'No saved drafts yet.' })}
          </div>
        ) : draftList.map((draft) => (
          <button
            type="button"
            key={draft.draftId}
            onClick={() => openDraft(draft.draftId)}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${selectedDraftId === draft.draftId ? draft.stage === 'brief' ? 'border-golden-honey bg-[linear-gradient(135deg,rgba(162,201,225,0.18),rgba(255,204,102,0.14))]' : 'border-golden-honey bg-golden-honey/10' : draft.stage === 'brief' ? 'border-sky-blue/40 bg-sky-blue/10 hover:border-sky-blue/60 hover:bg-sky-blue/14 dark:border-sky-blue/30 dark:bg-sky-blue/10 dark:hover:bg-sky-blue/14' : 'border-slate-navy/10 hover:border-golden-honey/40 hover:bg-slate-navy/5 dark:border-white/10 dark:hover:bg-white/5'}`}
          >
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-slate-navy dark:text-white">{draft.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-warm-gray">{t('social.savedDraftDescription', {
                defaultValue: '{{platform}} {{mediaType}} for {{contentTopic}}',
                platform: getPlatformLabel(draft.platform),
                mediaType: getMediaTypeLabel(draft.mediaType).toLowerCase(),
                contentTopic: getContentTopicLabel(draft.contentTopic).toLowerCase(),
              })}</p>
            </div>
            <div className="mt-3 flex flex-col gap-1 text-xs text-warm-gray sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="truncate">{t('social.updatedAtLabel', { defaultValue: 'Updated {{value}}', value: formatUpdatedAt(draft.updatedAt) })}</span>
              <span className="shrink-0">{t('social.mediaCountLabel', { defaultValue: '{{count}} media', count: draft.mediaCount })}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title={t('social.aiPostBuilderTitle', { defaultValue: 'AI Post Builder' })}
        subtitle={t('social.aiPostBuilderSubtitle', { defaultValue: 'Build a draft brief, generate a post, then keep refining it with AI or direct edits.' })}
        action={
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {currentStage === 'compose' && activeDraft.draftId > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="border border-slate-navy/10 text-warm-gray hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:text-white/70 dark:hover:border-red-400/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
              >
                <Trash2 size={16} />
                {t('social.deleteDraft', { defaultValue: 'Delete Draft' })}
              </Button>
            )}
            <Button size="sm" onClick={() => void handleExplicitSave()} loading={createDraftMutation.isPending || updateDraftMutation.isPending || uploading}>
              <Save size={16} />
              {t('social.saveDraft')}
            </Button>
          </div>
        }
      />

      {statusMessage && (
        <div className="mb-5 rounded-2xl border border-golden-honey/40 bg-golden-honey/10 px-4 py-3 text-sm text-slate-navy dark:text-white">
          {statusMessage}
        </div>
      )}

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-w-0">{savedPostsCard}</div>

        <div className="min-w-0 space-y-6">
        {currentStage === 'compose' && (
          <Card className="space-y-4 bg-gradient-to-r from-sky-blue/12 via-white to-golden-honey/12 dark:from-sky-blue/10 dark:via-slate-navy/70 dark:to-golden-honey/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">{t('social.performanceAndTiming', { defaultValue: 'Performance & Timing' })}</p>
                <p className="mt-1 text-sm text-warm-gray">{t('social.performanceTimingHelper', { defaultValue: 'Predict content performance, or let AI suggest optimal posting times. Select a time slot to see a time-adjusted value estimate.' })}</p>
              </div>
              <div className="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row lg:self-auto">
                <Button variant="ghost" onClick={() => void fetchPerformance()} loading={performanceLoading} className="border border-slate-navy/15 dark:border-white/15">
                  <BarChart2 size={16} />
                  {t('social.predictPerformance', { defaultValue: 'Predict Performance' })}
                </Button>
                <Button onClick={() => void fetchBestTimes()} loading={timesLoading}>
                  <WandSparkles size={16} />
                  {t('social.suggestTimes', { defaultValue: 'Suggest Times' })}
                </Button>
              </div>
            </div>

            {performanceError && <p className="text-sm text-red-600">{performanceError}</p>}
            {timesError && <p className="text-sm text-red-600">{timesError}</p>}

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_260px]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-navy/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-navy/60">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="break-words text-xs uppercase tracking-[0.2em] text-warm-gray sm:truncate">{metric.label}</p>
                      {metric.timeAdjusted && (
                        <span className="shrink-0 rounded-full bg-sky-blue/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-navy dark:bg-sky-blue/25 dark:text-sky-blue">
                          {t('social.timeAdjusted', { defaultValue: 'time-adjusted' })}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-heading text-2xl font-semibold text-slate-navy dark:text-white">{metric.value}</p>
                    {metric.description && <p className="mt-1 text-xs text-warm-gray">{metric.description}</p>}
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-navy/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-navy/60">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-navy dark:text-white">
                  <CalendarClock size={16} />
                  {t('social.suggestedTimes', { defaultValue: 'Suggested Times' })}
                </div>
                <div className="mt-3 space-y-2">
                  {bestTimes.length === 0 ? (
                    <p className="text-sm text-warm-gray">{t('social.runInsightsHint', { defaultValue: 'Run the insight refresh once you like the generated post.' })}</p>
                  ) : bestTimes.map((slot) => (
                    <button
                      type="button"
                      key={`${slot.dayOfWeek}-${slot.postHour}`}
                      onClick={() => setActiveDraft((prev) => ({ ...prev, scheduledDay: slot.dayOfWeek, scheduledHour: slot.postHour }))}
                      className={`flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2 text-left text-sm transition-colors sm:flex-row sm:items-center sm:justify-between ${activeDraft.scheduledDay === slot.dayOfWeek && activeDraft.scheduledHour === slot.postHour ? 'bg-golden-honey text-slate-navy' : 'bg-slate-navy/5 text-slate-navy hover:bg-slate-navy/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'}`}
                    >
                      <span>{t('social.suggestedTimeSlot', { defaultValue: '{{day}} {{time}}', day: slot.dayOfWeek, time: formatHour(slot.postHour) })}</span>
                      <span className="text-xs">{t('social.rankLabel', { defaultValue: '#{{rank}}', rank: slot.rank })}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

            {currentStage === 'compose' ? (
              <>
                <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                  <div className="min-w-0 space-y-6">
                    <Card className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-heading text-xl font-semibold text-slate-navy dark:text-white">{t('social.stageTwoTitle', { defaultValue: 'Stage 2: Refine the Post' })}</p>
                          <p className="mt-1 text-sm text-warm-gray">{t('social.stageTwoHelper', { defaultValue: 'Edit the generated content directly or use chat to revise it.' })}</p>
                        </div>
                        <StagePill active>{t('social.stageTwo', { defaultValue: 'Stage 2' })}</StagePill>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label={t('social.draftTitle')} value={activeDraft.title} onChange={(event) => setActiveDraft((prev) => ({ ...prev, title: event.target.value }))} />
                        <Input label={t('social.headline')} value={activeDraft.headline} onChange={(event) => setActiveDraft((prev) => ({ ...prev, headline: event.target.value }))} />
                        <SelectField label={t('social.platform')} value={activeDraft.platform} options={PLATFORMS} onChange={(value) => setActiveDraft((prev) => ({ ...prev, platform: value }))} getOptionLabel={getOptionLabel} />
                        <SelectField label={t('social.mediaType')} value={activeDraft.mediaType} options={MEDIA_TYPES} onChange={(value) => setActiveDraft((prev) => ({ ...prev, mediaType: value }))} getOptionLabel={getOptionLabel} />
                        <SelectField label={t('social.postType')} value={activeDraft.postType} options={POST_TYPES} onChange={(value) => setActiveDraft((prev) => ({ ...prev, postType: value }))} getOptionLabel={getOptionLabel} />
                        <SelectField label={t('social.callToAction')} value={activeDraft.callToActionType} options={CTA_TYPES} onChange={(value) => setActiveDraft((prev) => ({ ...prev, callToActionType: value }))} getOptionLabel={getOptionLabel} />
                      </div>

                      <RichTextEditor
                        label={t('social.postBody', { defaultValue: 'Post body' })}
                        value={activeDraft.body}
                        onChange={(value) => setActiveDraft((prev) => ({ ...prev, body: normalizeRichTextHtml(value) }))}
                        placeholder={t('social.postBodyPlaceholder', { defaultValue: 'Write the main body of the post...' })}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label={t('social.hashtags')} value={activeDraft.hashtags} onChange={(event) => setActiveDraft((prev) => ({ ...prev, hashtags: event.target.value }))} />
                        <Input label={t('social.ctaText')} value={activeDraft.ctaText} onChange={(event) => setActiveDraft((prev) => ({ ...prev, ctaText: event.target.value }))} />
                        <Input label={t('social.websiteUrl')} value={activeDraft.websiteUrl} onChange={(event) => setActiveDraft((prev) => ({ ...prev, websiteUrl: event.target.value }))} />
                        <Input label={t('social.audienceDescription')} value={activeDraft.audience} onChange={(event) => setActiveDraft((prev) => ({ ...prev, audience: event.target.value }))} />
                        <Input label={t('social.campaignNameField')} value={activeDraft.campaignName} onChange={(event) => setActiveDraft((prev) => ({ ...prev, campaignName: event.target.value }))} />
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-navy dark:text-white">{t('social.additionalNotes', { defaultValue: 'Additional notes' })}</span>
                        <textarea
                          rows={4}
                          value={activeDraft.additionalInstructions}
                          onChange={(event) => setActiveDraft((prev) => ({ ...prev, additionalInstructions: event.target.value }))}
                          className="rounded-2xl border border-slate-navy/15 bg-white px-4 py-3 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/30 dark:border-white/10 dark:bg-slate-navy dark:text-white"
                        />
                      </label>

                      {combinedAttachments.length > 0 && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {combinedAttachments.map((item) => (
                            <div key={item.mediaId} className="rounded-2xl border border-slate-navy/10 bg-white p-3 dark:border-white/10 dark:bg-slate-navy/70">
                              {item.mediaKind === 'image' && item.previewUrl && <img src={item.previewUrl} alt={item.fileName} className="h-40 w-full rounded-xl object-cover" />}
                              {item.mediaKind === 'video' && item.previewUrl && <video src={item.previewUrl} controls className="h-40 w-full rounded-xl object-cover bg-black" />}
                              {item.mediaKind === 'file' && <div className="flex h-40 items-center justify-center rounded-xl bg-slate-navy/5 text-sm text-warm-gray dark:bg-white/5">{item.fileName}</div>}
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-navy dark:text-white">{item.fileName}</p>
                                  <p className="text-xs text-warm-gray">{Math.round(item.fileSizeBytes / 1024)} KB</p>
                                </div>
                                {item.mediaId > 0 && (
                                  <button type="button" onClick={() => void handleRemovePersistedAttachment(item.mediaId)} className="rounded-full p-2 text-warm-gray hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  <div className="min-w-0 space-y-6">
                    <Card className="space-y-5 bg-gradient-to-br from-white via-coral-pink/12 to-sky-blue/14 dark:from-slate-navy/70 dark:via-coral-pink/10 dark:to-sky-blue/10">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">{t('common.preview')}</p>
                          <p className="mt-1 text-sm text-warm-gray">{t('social.platformPreviewHelper', { defaultValue: 'Styled to feel native to the selected platform, but every field stays editable.' })}</p>
                        </div>
                        <div className="text-left text-xs text-warm-gray sm:text-right">
                          {activeDraft.scheduledDay && activeDraft.scheduledHour !== null ? (
                            <span>{t('social.suggestedSlotLabel', { defaultValue: 'Suggested slot: {{day}} {{time}}', day: activeDraft.scheduledDay, time: formatHour(activeDraft.scheduledHour) })}</span>
                          ) : (
                            <span>{t('social.chooseTimeAfterRefresh', { defaultValue: 'Choose a time after refreshing insights.' })}</span>
                          )}
                        </div>
                      </div>
                      <SocialDraftPreview draft={activeDraft} attachments={combinedAttachments} />
                    </Card>

                    <Card className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-navy dark:text-white">
                        <RefreshCcw size={17} />
                        <p className="font-heading text-base font-semibold">{t('social.draftStatus', { defaultValue: 'Draft status' })}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-navy/5 p-4 text-sm text-slate-navy dark:bg-white/5 dark:text-white/80">
                          <p className="text-xs uppercase tracking-[0.18em] text-warm-gray">{t('social.savedStateLabel', { defaultValue: 'Saved' })}</p>
                          <p className="mt-2 font-medium">{activeDraft.draftId > 0 ? t('social.persistedDraft', { defaultValue: 'Persisted draft' }) : t('social.notSavedYet', { defaultValue: 'Not saved yet' })}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-navy/5 p-4 text-sm text-slate-navy dark:bg-white/5 dark:text-white/80">
                          <p className="text-xs uppercase tracking-[0.18em] text-warm-gray">{t('social.lastUpdated', { defaultValue: 'Last updated' })}</p>
                          <p className="mt-2 font-medium">{formatUpdatedAt(activeDraft.updatedAt)}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Card className="overflow-hidden border border-slate-navy/10 bg-gradient-to-br from-white via-sky-blue/6 to-coral-pink/10 p-0 dark:border-white/10 dark:from-slate-navy/80 dark:via-slate-navy/70 dark:to-sky-blue/8">
                  <div className="border-b border-slate-navy/10 px-4 py-4 sm:px-6 sm:py-5 dark:border-white/10">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3 text-slate-navy dark:text-white">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-golden-honey/20 text-golden-honey-text dark:text-golden-honey">
                          <MessageSquareText size={18} />
                        </div>
                        <div>
                          <p className="font-heading text-lg font-semibold">{t('social.aiRefineChat', { defaultValue: 'AI Refine Chat' })}</p>
                          <p className="text-sm text-warm-gray">{t('social.aiRefineChatHelper', { defaultValue: 'Ask for rewrites, tone shifts, CTA changes, or platform-specific edits.' })}</p>
                        </div>
                      </div>
                      <p className="text-xs text-warm-gray">{t('social.chatKeyboardHint', { defaultValue: 'Press Enter to send. Shift+Enter for a new line.' })}</p>
                    </div>
                  </div>

                  <div ref={chatScrollContainerRef} className="max-h-[34rem] min-h-[24rem] space-y-4 overflow-y-auto bg-white/70 px-4 py-4 sm:px-6 sm:py-6 dark:bg-slate-navy/40">
                    {activeDraft.chatHistory.length === 0 && !chatIsThinking ? (
                      <div className="rounded-3xl border border-dashed border-slate-navy/15 bg-white/80 px-5 py-8 text-sm text-warm-gray dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                        {t('social.emptyChatHint', { defaultValue: 'Ask AI to tighten the caption, shift the tone, rewrite the CTA, adapt this into a Reel hook, or make it sound more donor-facing.' })}
                      </div>
                    ) : (
                      <>
                        {activeDraft.chatHistory.map((message, index) => (
                          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[min(92%,56rem)] rounded-[1.75rem] px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[min(85%,56rem)] sm:px-5 sm:py-4 ${message.role === 'assistant' ? 'border border-slate-navy/10 bg-white text-slate-navy dark:border-white/10 dark:bg-slate-navy dark:text-white' : 'bg-golden-honey text-slate-navy'}`}>
                              {message.role === 'assistant' && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-warm-gray">{t('social.aiAssistant', { defaultValue: 'AI Assistant' })}</p>}
                              {message.role === 'user' && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-navy/60">{t('social.you', { defaultValue: 'You' })}</p>}
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                          </div>
                        ))}

                        {chatIsThinking && (
                          <div className="flex justify-start">
                            <div className="max-w-[min(92%,56rem)] rounded-[1.75rem] border border-slate-navy/10 bg-white px-4 py-3 text-sm text-slate-navy shadow-sm sm:max-w-[min(85%,56rem)] sm:px-5 sm:py-4 dark:border-white/10 dark:bg-slate-navy dark:text-white">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-warm-gray">{t('social.aiAssistant', { defaultValue: 'AI Assistant' })}</p>
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-golden-honey [animation-delay:-0.2s]" />
                                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-golden-honey [animation-delay:-0.1s]" />
                                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-golden-honey" />
                                </div>
                                <span className="text-warm-gray dark:text-white/70">{t('social.aiEditingDraft', { defaultValue: 'Editing your draft and applying changes...' })}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-slate-navy/10 bg-white/90 px-4 py-4 sm:px-6 sm:py-5 dark:border-white/10 dark:bg-slate-navy/70">
                    <div className="rounded-[1.75rem] border border-slate-navy/12 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-navy">
                      <textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={handleChatInputKeyDown}
                        placeholder={t('social.chatInputPlaceholder', { defaultValue: 'Tell AI how to revise this draft...' })}
                        rows={1}
                        disabled={chatIsThinking}
                        className="max-h-40 min-h-[5.5rem] w-full resize-y border-0 bg-transparent px-2 py-2 text-sm leading-6 text-slate-navy placeholder:text-warm-gray/60 focus:outline-none dark:text-white"
                      />
                      <div className="mt-3 flex flex-col gap-3 border-t border-slate-navy/10 px-2 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                        <p className="text-xs text-warm-gray">{t('social.chatExamples', { defaultValue: 'Examples: “Make it more donor-focused”, “Shorten this for X”, “Write a stronger hook”.' })}</p>
                        <Button onClick={() => void handleChatSend()} disabled={!chatInput.trim()} loading={chatIsThinking}>
                          <Sparkles size={16} />
                          {t('social.send', { defaultValue: 'Send' })}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-heading text-xl font-semibold text-slate-navy dark:text-white">{t('social.stageOneTitle', { defaultValue: 'Stage 1: Build the Brief' })}</p>
                    <p className="mt-1 text-sm text-warm-gray">{t('social.stageOneHelper', { defaultValue: 'Answer the questions AI needs before it drafts a post.' })}</p>
                  </div>
                  <StagePill active>{t('social.stageOne', { defaultValue: 'Stage 1' })}</StagePill>
                </div>
                <Card className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label={t('social.draftTitle')} error={form.formState.errors.title?.message} {...form.register('title')} />
                    <Input label={t('social.audienceDescription')} error={form.formState.errors.audience?.message} {...form.register('audience')} />
                    <SelectField label={t('social.platform')} value={form.watch('platform')} options={PLATFORMS} onChange={(value) => form.setValue('platform', value as BriefValues['platform'], { shouldValidate: true })} getOptionLabel={getOptionLabel} />
                    <SelectField label={t('social.postType')} value={form.watch('postType')} options={POST_TYPES} onChange={(value) => form.setValue('postType', value as BriefValues['postType'], { shouldValidate: true })} getOptionLabel={getOptionLabel} />
                    <SelectField label={t('social.mediaType')} value={form.watch('mediaType')} options={MEDIA_TYPES} onChange={(value) => form.setValue('mediaType', value as BriefValues['mediaType'], { shouldValidate: true })} helper={t('social.mediaTypeHelper', { defaultValue: 'Choose the format you want the generated composer to mimic.' })} getOptionLabel={getOptionLabel} />
                    <SelectField label={t('social.sentimentTone')} value={form.watch('sentimentTone')} options={SENTIMENT_TONES} onChange={(value) => form.setValue('sentimentTone', value as BriefValues['sentimentTone'], { shouldValidate: true })} getOptionLabel={getOptionLabel} />
                    <SelectField label={t('social.callToAction')} value={form.watch('callToActionType')} options={CTA_TYPES} onChange={(value) => form.setValue('callToActionType', value as BriefValues['callToActionType'], { shouldValidate: true })} getOptionLabel={getOptionLabel} />
                    <SelectField label={t('social.contentTopic')} value={form.watch('contentTopic')} options={CONTENT_TOPICS} onChange={(value) => form.setValue('contentTopic', value as BriefValues['contentTopic'], { shouldValidate: true })} getOptionLabel={getOptionLabel} />
                    <Input label={t('social.campaignNameField')} {...form.register('campaignName')} />
                    <Input label={t('social.hashtagsWantedOptional', { defaultValue: 'Hashtags wanted (optional)' })} {...form.register('hashtags')} />
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-navy dark:text-white">{t('social.additionalInstructions')}</span>
                    <textarea
                      rows={5}
                      {...form.register('additionalInstructions')}
                      className="rounded-2xl border border-slate-navy/15 bg-white px-4 py-3 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/30 dark:border-white/10 dark:bg-slate-navy dark:text-white"
                      placeholder={t('social.additionalInstructionsPlaceholder', { defaultValue: 'What should the AI emphasize, avoid, or include?' })}
                    />
                  </label>

                  {needsVisualMedia(form.watch('mediaType')) && (
                    <div className="space-y-3 rounded-[1.5rem] border border-dashed border-slate-navy/15 bg-slate-navy/5 p-5 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-slate-navy dark:text-white">
                        <ImagePlus size={18} />
                        <p className="font-heading text-base font-semibold">{t('common.addMedia')}</p>
                      </div>
                      <p className="text-sm text-warm-gray">{t('social.addMediaHelper', { defaultValue: 'Upload the image or video you want attached to this post. It will stay local until you save the draft.' })}</p>
                      <input
                        type="file"
                        accept={form.watch('mediaType') === 'Video' || form.watch('mediaType') === 'Reel' ? 'video/*' : 'image/*,video/*'}
                        multiple={form.watch('mediaType') === 'Carousel'}
                        onChange={(event) => void handleUploadSelection(event.target.files)}
                        className="block w-full text-sm text-warm-gray file:mr-4 file:rounded-full file:border-0 file:bg-golden-honey file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-navy hover:file:bg-golden-honey/90"
                      />

                      {combinedAttachments.length > 0 && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {combinedAttachments.map((item) => (
                            <div key={item.mediaId} className="rounded-2xl border border-slate-navy/10 bg-white p-3 dark:border-white/10 dark:bg-slate-navy/70">
                              {item.mediaKind === 'image' && item.previewUrl && <img src={item.previewUrl} alt={item.fileName} className="h-40 w-full rounded-xl object-cover" />}
                              {item.mediaKind === 'video' && item.previewUrl && <video src={item.previewUrl} controls className="h-40 w-full rounded-xl object-cover bg-black" />}
                              {item.mediaKind === 'file' && <div className="flex h-40 items-center justify-center rounded-xl bg-slate-navy/5 text-sm text-warm-gray dark:bg-white/5">{item.fileName}</div>}
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-navy dark:text-white">{item.fileName}</p>
                                  <p className="text-xs text-warm-gray">{Math.round(item.fileSizeBytes / 1024)} KB</p>
                                </div>
                                {item.mediaId > 0 ? (
                                  <button type="button" onClick={() => void handleRemovePersistedAttachment(item.mediaId)} className="rounded-full p-2 text-warm-gray hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPendingUploads((prev) => {
                                      if (!("tempId" in item)) {
                                        return prev;
                                      }
                                      const target = prev.find((pending) => pending.tempId === item.tempId);
                                      if (target?.previewUrl) {
                                        URL.revokeObjectURL(target.previewUrl);
                                      }
                                      return prev.filter((pending) => pending.tempId !== item.tempId);
                                    })}
                                    className="rounded-full p-2 text-warm-gray hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={() => void handleGenerate()}>
                      <Sparkles size={16} />
                      {t('social.generatePost', { defaultValue: 'Generate Post' })}
                    </Button>
                    <Button variant="ghost" onClick={() => void handleExplicitSave()} loading={createDraftMutation.isPending || updateDraftMutation.isPending || uploading}>
                      <Save size={16} />
                      {t('social.saveDraftFirst', { defaultValue: 'Save Draft First' })}
                    </Button>
                  </div>
                </Card>

                <Card className="space-y-4 bg-gradient-to-br from-sky-blue/15 via-white to-coral-pink/20 dark:from-sky-blue/10 dark:via-slate-navy/60 dark:to-coral-pink/10">
                  <div>
                    <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">{t('social.whatHappensNext', { defaultValue: 'What happens next' })}</p>
                    <p className="mt-1 text-sm text-warm-gray">{t('social.whatHappensNextHelper', { defaultValue: 'AI uses your answers to build a first draft that still stays editable.' })}</p>
                  </div>
                  <div className="space-y-3 text-sm text-slate-navy dark:text-white/90">
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-navy/60">
                      <p className="font-medium">{t('social.nextStepOneTitle', { defaultValue: '1. AI drafts the post' })}</p>
                      <p className="mt-1 text-warm-gray">{t('social.nextStepOneHelper', { defaultValue: 'Headline, caption, CTA, and hashtags are generated from your brief.' })}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-navy/60">
                      <p className="font-medium">{t('social.nextStepTwoTitle', { defaultValue: '2. You edit everything directly' })}</p>
                      <p className="mt-1 text-warm-gray">{t('social.nextStepTwoHelper', { defaultValue: 'The generated layout behaves like a platform-specific composer, not a locked preview.' })}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-navy/60">
                      <p className="font-medium">{t('social.nextStepThreeTitle', { defaultValue: '3. AI keeps collaborating' })}</p>
                      <p className="mt-1 text-warm-gray">{t('social.nextStepThreeHelper', { defaultValue: 'Use the chat in stage 2 to tighten wording, change tone, or try a different angle.' })}</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleteDraftMutation.isPending) {
            setIsDeleteModalOpen(false);
          }
        }}
        title={t('social.deleteDraft', { defaultValue: 'Delete Draft' })}
        onConfirm={() => void handleDeleteDraft()}
        confirmText={deleteDraftMutation.isPending ? t('social.deletingDraft', { defaultValue: 'Deleting...' }) : t('social.deleteDraft', { defaultValue: 'Delete Draft' })}
        confirmVariant="danger"
      >
        <div className="space-y-3 text-sm text-slate-navy dark:text-white/85">
          <p>{t('social.deleteSavedDraftPrompt', { defaultValue: 'Delete this saved draft?' })}</p>
          <p className="text-warm-gray dark:text-white/65">{t('social.deleteSavedDraftWarning', { defaultValue: 'This will remove the draft and any uploaded media attached to it. This action cannot be undone.' })}</p>
        </div>
      </Modal>
    </div>
  );
}
