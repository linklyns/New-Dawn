import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ImagePlus, MessageSquareText, RefreshCcw, Save, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import { normalizeRichTextHtml, richTextToPlainText } from '../../lib/richText';
import type { PagedResult } from '../../types/api';
import type { BestPostingTime, MlSocialPostPrediction } from '../../types/predictions';
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

function createEmptyDraft(): SocialMediaDraft {
  return {
    draftId: 0,
    title: 'Untitled draft',
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
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function needsVisualMedia(mediaType: string): boolean {
  return mediaType === 'Photo' || mediaType === 'Video' || mediaType === 'Carousel' || mediaType === 'Reel';
}

function describeDraft(draft: Pick<SocialMediaDraft, 'platform' | 'mediaType' | 'contentTopic'>) {
  const platformLabel = PLATFORM_LABELS[draft.platform] ?? draft.platform;
  return `${platformLabel} ${draft.mediaType.toLowerCase()} for ${draft.contentTopic.toLowerCase()}`;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-navy dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-navy/15 bg-white px-4 py-3 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/30 dark:border-white/10 dark:bg-slate-navy dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>{OPTION_LABELS[option] ?? option}</option>
        ))}
      </select>
      {helper && <span className="text-xs text-warm-gray">{helper}</span>}
    </label>
  );
}

function StagePill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${active ? 'bg-golden-honey text-slate-navy' : 'bg-slate-navy/5 text-warm-gray dark:bg-white/10 dark:text-white/60'}`}>
      {children}
    </span>
  );
}

export function SocialEditorPage() {
  const queryClient = useQueryClient();
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [activeDraft, setActiveDraft] = useState<SocialMediaDraft>(createEmptyDraft);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [persistedPreviewUrls, setPersistedPreviewUrls] = useState<Record<number, string>>({});
  const [prediction, setPrediction] = useState<MlSocialPostPrediction | null>(null);
  const [bestTimes, setBestTimes] = useState<BestPostingTime[]>([]);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatIsThinking, setChatIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const autoSaveSkipRef = useRef(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
      setStatusMessage('Draft saved.');
    }

    return finalDraft;
  }, [createDraftMutation, form, pendingUploads, queryClient, updateDraftMutation]);

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
    setInsightError(null);
    setChatInput('');
    setStatusMessage(null);
    clearPendingUploads();
    autoSaveSkipRef.current = true;
    const nextDraft = createEmptyDraft();
    setActiveDraft(nextDraft);
    form.reset(toBriefValues(nextDraft));
  }, [clearPendingUploads, form]);

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
      setStatusMessage('AI generated a new post draft.');
      setPrediction(null);
      setBestTimes([]);
      setInsightError(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to generate a draft right now.');
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
    setStatusMessage('Draft deleted.');
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
    setStatusMessage('Media added locally. Save the draft to persist it.');
  };

  const refreshInsights = async () => {
    setInsightsLoading(true);
    setInsightError(null);

    try {
      const [predictionResp, bestTimesResp] = await Promise.all([
        api.post<{ items: MlSocialPostPrediction[] }>('/api/predictions/ml/social-lookup', {
          platform: activeDraft.platform,
          postType: activeDraft.postType,
          mediaType: activeDraft.mediaType,
          contentTopic: activeDraft.contentTopic,
          sentimentTone: activeDraft.sentimentTone,
          callToActionType: activeDraft.callToActionType,
        }),
        api.get<{ items: BestPostingTime[] }>('/api/predictions/ml/best-posting-times'),
      ]);

      setPrediction(predictionResp.items?.[0] ?? null);
      setBestTimes(bestTimesResp.items?.slice(0, 5) ?? []);

      const bestSlot = bestTimesResp.items?.[0];
      if (bestSlot) {
        autoSaveSkipRef.current = true;
        setActiveDraft((prev) => ({
          ...prev,
          scheduledDay: bestSlot.dayOfWeek,
          scheduledHour: bestSlot.postHour,
        }));
      }
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : 'Unable to refresh insights right now.');
    } finally {
      setInsightsLoading(false);
    }
  };

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
      setStatusMessage('AI applied a new revision.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to refine the draft right now.');
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
  const performanceMetrics = useMemo(() => ([
    {
      label: 'Predicted Referrals',
      value: prediction ? prediction.predictedDonationReferrals.toFixed(1) : '--',
    },
    {
      label: 'Estimated Value',
      value: prediction ? `PHP ${prediction.predictedEstimatedDonationValuePhp.toLocaleString()}` : '--',
    },
    {
      label: 'Engagement',
      value: prediction ? `${prediction.predictedEngagementRate.toFixed(2)}%` : '--',
    },
    {
      label: 'Forwards',
      value: prediction ? prediction.predictedForwards.toFixed(1) : '--',
    },
    {
      label: 'Profile Visits',
      value: prediction ? prediction.predictedProfileVisits.toFixed(1) : '--',
    },
    {
      label: 'Impressions',
      value: prediction ? prediction.predictedImpressions.toFixed(1) : '--',
    },
  ]), [prediction]);

  const savedPostsCard = (
    <Card className="flex h-full self-stretch flex-col space-y-4 p-0">
      <div className="border-b border-slate-navy/10 px-5 py-5 dark:border-white/10">
        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">Saved Posts</p>
          <p className="mt-1 text-sm text-warm-gray">Resume any saved draft and keep working with AI.</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 pb-4">
        <button
          type="button"
          onClick={startNewPost}
          className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${selectedDraftId === null ? 'border-golden-honey bg-golden-honey/10' : 'border-slate-navy/10 bg-sky-blue/8 hover:border-golden-honey/40 hover:bg-sky-blue/12 dark:border-white/10 dark:bg-sky-blue/10 dark:hover:bg-sky-blue/15'}`}
        >
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold text-slate-navy dark:text-white">New post</p>
            <p className="mt-1 text-xs text-warm-gray">Start from a fresh brief</p>
          </div>
        </button>

        {draftsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10"><Spinner size="lg" /></div>
        ) : draftList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-navy/15 px-4 py-8 text-center text-sm text-warm-gray dark:border-white/10 dark:text-white/60">
            No saved drafts yet.
          </div>
        ) : draftList.map((draft) => (
          <button
            type="button"
            key={draft.draftId}
            onClick={() => setSelectedDraftId(draft.draftId)}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${selectedDraftId === draft.draftId ? draft.stage === 'brief' ? 'border-golden-honey bg-[linear-gradient(135deg,rgba(162,201,225,0.18),rgba(255,204,102,0.14))]' : 'border-golden-honey bg-golden-honey/10' : draft.stage === 'brief' ? 'border-sky-blue/40 bg-sky-blue/10 hover:border-sky-blue/60 hover:bg-sky-blue/14 dark:border-sky-blue/30 dark:bg-sky-blue/10 dark:hover:bg-sky-blue/14' : 'border-slate-navy/10 hover:border-golden-honey/40 hover:bg-slate-navy/5 dark:border-white/10 dark:hover:bg-white/5'}`}
          >
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-slate-navy dark:text-white">{draft.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-warm-gray">{describeDraft({ platform: draft.platform, mediaType: draft.mediaType, contentTopic: draft.contentTopic })}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-warm-gray">
              <span className="truncate">Updated {formatUpdatedAt(draft.updatedAt)}</span>
              <span className="shrink-0">{draft.mediaCount} media</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="AI Post Builder"
        subtitle="Build a draft brief, generate a post, then keep refining it with AI or direct edits."
        action={
          <div className="flex items-center gap-2">
            {currentStage === 'compose' && activeDraft.draftId > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="border border-slate-navy/10 text-warm-gray hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:text-white/70 dark:hover:border-red-400/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
              >
                <Trash2 size={16} />
                Delete Draft
              </Button>
            )}
            <Button size="sm" onClick={() => void handleExplicitSave()} loading={createDraftMutation.isPending || updateDraftMutation.isPending || uploading}>
              <Save size={16} />
              Save Draft
            </Button>
          </div>
        }
      />

      {statusMessage && (
        <div className="mb-5 rounded-2xl border border-golden-honey/40 bg-golden-honey/10 px-4 py-3 text-sm text-slate-navy dark:text-white">
          {statusMessage}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        {savedPostsCard}

        <div className="space-y-6">
        {currentStage === 'compose' && (
          <Card className="space-y-4 bg-gradient-to-r from-sky-blue/12 via-white to-golden-honey/12 dark:from-sky-blue/10 dark:via-slate-navy/70 dark:to-golden-honey/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">Performance & Timing</p>
                <p className="mt-1 text-sm text-warm-gray">Refresh ML-backed performance predictions and let AI choose a suggested posting time.</p>
              </div>
              <Button onClick={() => void refreshInsights()} loading={insightsLoading} className="self-start lg:self-auto">
                <WandSparkles size={16} />
                AI Suggest Best Time
              </Button>
            </div>

            {insightError && <p className="text-sm text-red-600">{insightError}</p>}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_260px]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-navy/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-navy/60">
                    <p className="truncate text-xs uppercase tracking-[0.2em] text-warm-gray">{metric.label}</p>
                    <p className="mt-2 font-heading text-2xl font-semibold text-slate-navy dark:text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-navy/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-navy/60">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-navy dark:text-white">
                  <CalendarClock size={16} />
                  Suggested Times
                </div>
                <div className="mt-3 space-y-2">
                  {bestTimes.length === 0 ? (
                    <p className="text-sm text-warm-gray">Run the insight refresh once you like the generated post.</p>
                  ) : bestTimes.map((slot) => (
                    <button
                      type="button"
                      key={`${slot.dayOfWeek}-${slot.postHour}`}
                      onClick={() => setActiveDraft((prev) => ({ ...prev, scheduledDay: slot.dayOfWeek, scheduledHour: slot.postHour }))}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${activeDraft.scheduledDay === slot.dayOfWeek && activeDraft.scheduledHour === slot.postHour ? 'bg-golden-honey text-slate-navy' : 'bg-slate-navy/5 text-slate-navy hover:bg-slate-navy/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'}`}
                    >
                      <span>{slot.dayOfWeek} {formatHour(slot.postHour)}</span>
                      <span className="text-xs">#{slot.rank}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

            {currentStage === 'compose' ? (
              <>
                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                  <div className="space-y-6">
                    <Card className="space-y-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-heading text-xl font-semibold text-slate-navy dark:text-white">Stage 2: Refine the Post</p>
                          <p className="mt-1 text-sm text-warm-gray">Edit the generated content directly or use chat to revise it.</p>
                        </div>
                        <StagePill active>Stage 2</StagePill>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Draft title" value={activeDraft.title} onChange={(event) => setActiveDraft((prev) => ({ ...prev, title: event.target.value }))} />
                        <Input label="Headline" value={activeDraft.headline} onChange={(event) => setActiveDraft((prev) => ({ ...prev, headline: event.target.value }))} />
                        <SelectField label="Platform" value={activeDraft.platform} options={PLATFORMS} onChange={(value) => setActiveDraft((prev) => ({ ...prev, platform: value }))} />
                        <SelectField label="Media type" value={activeDraft.mediaType} options={MEDIA_TYPES} onChange={(value) => setActiveDraft((prev) => ({ ...prev, mediaType: value }))} />
                        <SelectField label="Post type" value={activeDraft.postType} options={POST_TYPES} onChange={(value) => setActiveDraft((prev) => ({ ...prev, postType: value }))} />
                        <SelectField label="Call to action" value={activeDraft.callToActionType} options={CTA_TYPES} onChange={(value) => setActiveDraft((prev) => ({ ...prev, callToActionType: value }))} />
                      </div>

                      <RichTextEditor
                        label="Post body"
                        value={activeDraft.body}
                        onChange={(value) => setActiveDraft((prev) => ({ ...prev, body: normalizeRichTextHtml(value) }))}
                        placeholder="Write the main body of the post..."
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Hashtags" value={activeDraft.hashtags} onChange={(event) => setActiveDraft((prev) => ({ ...prev, hashtags: event.target.value }))} />
                        <Input label="CTA text" value={activeDraft.ctaText} onChange={(event) => setActiveDraft((prev) => ({ ...prev, ctaText: event.target.value }))} />
                        <Input label="Website link" value={activeDraft.websiteUrl} onChange={(event) => setActiveDraft((prev) => ({ ...prev, websiteUrl: event.target.value }))} />
                        <Input label="Audience" value={activeDraft.audience} onChange={(event) => setActiveDraft((prev) => ({ ...prev, audience: event.target.value }))} />
                        <Input label="Campaign name" value={activeDraft.campaignName} onChange={(event) => setActiveDraft((prev) => ({ ...prev, campaignName: event.target.value }))} />
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-navy dark:text-white">Additional notes</span>
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
                              <div className="mt-3 flex items-center justify-between gap-3">
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

                  <div className="space-y-6">
                    <Card className="space-y-5 bg-gradient-to-br from-white via-coral-pink/12 to-sky-blue/14 dark:from-slate-navy/70 dark:via-coral-pink/10 dark:to-sky-blue/10">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">Platform Preview</p>
                          <p className="mt-1 text-sm text-warm-gray">Styled to feel native to the selected platform, but every field stays editable.</p>
                        </div>
                        <div className="text-right text-xs text-warm-gray">
                          {activeDraft.scheduledDay && activeDraft.scheduledHour !== null ? (
                            <span>Suggested slot: {activeDraft.scheduledDay} {formatHour(activeDraft.scheduledHour)}</span>
                          ) : (
                            <span>Choose a time after refreshing insights.</span>
                          )}
                        </div>
                      </div>
                      <SocialDraftPreview draft={activeDraft} attachments={combinedAttachments} />
                    </Card>

                    <Card className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-navy dark:text-white">
                        <RefreshCcw size={17} />
                        <p className="font-heading text-base font-semibold">Draft status</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-navy/5 p-4 text-sm text-slate-navy dark:bg-white/5 dark:text-white/80">
                          <p className="text-xs uppercase tracking-[0.18em] text-warm-gray">Saved</p>
                          <p className="mt-2 font-medium">{activeDraft.draftId > 0 ? 'Persisted draft' : 'Not saved yet'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-navy/5 p-4 text-sm text-slate-navy dark:bg-white/5 dark:text-white/80">
                          <p className="text-xs uppercase tracking-[0.18em] text-warm-gray">Last updated</p>
                          <p className="mt-2 font-medium">{formatUpdatedAt(activeDraft.updatedAt)}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Card className="overflow-hidden border border-slate-navy/10 bg-gradient-to-br from-white via-sky-blue/6 to-coral-pink/10 p-0 dark:border-white/10 dark:from-slate-navy/80 dark:via-slate-navy/70 dark:to-sky-blue/8">
                  <div className="border-b border-slate-navy/10 px-6 py-5 dark:border-white/10">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3 text-slate-navy dark:text-white">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-golden-honey/20 text-golden-honey-text dark:text-golden-honey">
                          <MessageSquareText size={18} />
                        </div>
                        <div>
                          <p className="font-heading text-lg font-semibold">AI Refine Chat</p>
                          <p className="text-sm text-warm-gray">Ask for rewrites, tone shifts, CTA changes, or platform-specific edits.</p>
                        </div>
                      </div>
                      <p className="text-xs text-warm-gray">Press Enter to send. Shift+Enter for a new line.</p>
                    </div>
                  </div>

                  <div className="max-h-[34rem] min-h-[24rem] space-y-4 overflow-y-auto bg-white/70 px-6 py-6 dark:bg-slate-navy/40">
                    {activeDraft.chatHistory.length === 0 && !chatIsThinking ? (
                      <div className="rounded-3xl border border-dashed border-slate-navy/15 bg-white/80 px-5 py-8 text-sm text-warm-gray dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                        Ask AI to tighten the caption, shift the tone, rewrite the CTA, adapt this into a Reel hook, or make it sound more donor-facing.
                      </div>
                    ) : (
                      <>
                        {activeDraft.chatHistory.map((message, index) => (
                          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[min(85%,56rem)] rounded-[1.75rem] px-5 py-4 text-sm leading-7 shadow-sm ${message.role === 'assistant' ? 'border border-slate-navy/10 bg-white text-slate-navy dark:border-white/10 dark:bg-slate-navy dark:text-white' : 'bg-golden-honey text-slate-navy'}`}>
                              {message.role === 'assistant' && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-warm-gray">AI Assistant</p>}
                              {message.role === 'user' && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-navy/60">You</p>}
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                          </div>
                        ))}

                        {chatIsThinking && (
                          <div className="flex justify-start">
                            <div className="max-w-[min(85%,56rem)] rounded-[1.75rem] border border-slate-navy/10 bg-white px-5 py-4 text-sm text-slate-navy shadow-sm dark:border-white/10 dark:bg-slate-navy dark:text-white">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-warm-gray">AI Assistant</p>
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-golden-honey [animation-delay:-0.2s]" />
                                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-golden-honey [animation-delay:-0.1s]" />
                                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-golden-honey" />
                                </div>
                                <span className="text-warm-gray dark:text-white/70">Editing your draft and applying changes...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-slate-navy/10 bg-white/90 px-6 py-5 dark:border-white/10 dark:bg-slate-navy/70">
                    <div className="rounded-[1.75rem] border border-slate-navy/12 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-navy">
                      <textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={handleChatInputKeyDown}
                        placeholder="Tell AI how to revise this draft..."
                        rows={1}
                        disabled={chatIsThinking}
                        className="max-h-40 min-h-[5.5rem] w-full resize-y border-0 bg-transparent px-2 py-2 text-sm leading-6 text-slate-navy placeholder:text-warm-gray/60 focus:outline-none dark:text-white"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-navy/10 px-2 pt-3 dark:border-white/10">
                        <p className="text-xs text-warm-gray">Examples: “Make it more donor-focused”, “Shorten this for X”, “Write a stronger hook”.</p>
                        <Button onClick={() => void handleChatSend()} disabled={!chatInput.trim()} loading={chatIsThinking}>
                          <Sparkles size={16} />
                          Send
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
                    <p className="font-heading text-xl font-semibold text-slate-navy dark:text-white">Stage 1: Build the Brief</p>
                    <p className="mt-1 text-sm text-warm-gray">Answer the questions AI needs before it drafts a post.</p>
                  </div>
                  <StagePill active>Stage 1</StagePill>
                </div>
                <Card className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Draft title" error={form.formState.errors.title?.message} {...form.register('title')} />
                    <Input label="Audience" error={form.formState.errors.audience?.message} {...form.register('audience')} />
                    <SelectField label="Platform" value={form.watch('platform')} options={PLATFORMS} onChange={(value) => form.setValue('platform', value as BriefValues['platform'], { shouldValidate: true })} />
                    <SelectField label="Post type" value={form.watch('postType')} options={POST_TYPES} onChange={(value) => form.setValue('postType', value as BriefValues['postType'], { shouldValidate: true })} />
                    <SelectField label="Media type" value={form.watch('mediaType')} options={MEDIA_TYPES} onChange={(value) => form.setValue('mediaType', value as BriefValues['mediaType'], { shouldValidate: true })} helper="Choose the format you want the generated composer to mimic." />
                    <SelectField label="Sentiment" value={form.watch('sentimentTone')} options={SENTIMENT_TONES} onChange={(value) => form.setValue('sentimentTone', value as BriefValues['sentimentTone'], { shouldValidate: true })} />
                    <SelectField label="Call to action" value={form.watch('callToActionType')} options={CTA_TYPES} onChange={(value) => form.setValue('callToActionType', value as BriefValues['callToActionType'], { shouldValidate: true })} />
                    <SelectField label="Content topic" value={form.watch('contentTopic')} options={CONTENT_TOPICS} onChange={(value) => form.setValue('contentTopic', value as BriefValues['contentTopic'], { shouldValidate: true })} />
                    <Input label="Campaign name" {...form.register('campaignName')} />
                    <Input label="Hashtags wanted (optional)" {...form.register('hashtags')} />
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-navy dark:text-white">Additional instructions</span>
                    <textarea
                      rows={5}
                      {...form.register('additionalInstructions')}
                      className="rounded-2xl border border-slate-navy/15 bg-white px-4 py-3 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/30 dark:border-white/10 dark:bg-slate-navy dark:text-white"
                      placeholder="What should the AI emphasize, avoid, or include?"
                    />
                  </label>

                  {needsVisualMedia(form.watch('mediaType')) && (
                    <div className="space-y-3 rounded-[1.5rem] border border-dashed border-slate-navy/15 bg-slate-navy/5 p-5 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-slate-navy dark:text-white">
                        <ImagePlus size={18} />
                        <p className="font-heading text-base font-semibold">Add media</p>
                      </div>
                      <p className="text-sm text-warm-gray">Upload the image or video you want attached to this post. It will stay local until you save the draft.</p>
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
                              <div className="mt-3 flex items-center justify-between gap-3">
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
                      Generate Post
                    </Button>
                    <Button variant="ghost" onClick={() => void handleExplicitSave()} loading={createDraftMutation.isPending || updateDraftMutation.isPending || uploading}>
                      <Save size={16} />
                      Save Draft First
                    </Button>
                  </div>
                </Card>

                <Card className="space-y-4 bg-gradient-to-br from-sky-blue/15 via-white to-coral-pink/20 dark:from-sky-blue/10 dark:via-slate-navy/60 dark:to-coral-pink/10">
                  <div>
                    <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">What happens next</p>
                    <p className="mt-1 text-sm text-warm-gray">AI uses your answers to build a first draft that still stays editable.</p>
                  </div>
                  <div className="space-y-3 text-sm text-slate-navy dark:text-white/90">
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-navy/60">
                      <p className="font-medium">1. AI drafts the post</p>
                      <p className="mt-1 text-warm-gray">Headline, caption, CTA, and hashtags are generated from your brief.</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-navy/60">
                      <p className="font-medium">2. You edit everything directly</p>
                      <p className="mt-1 text-warm-gray">The generated layout behaves like a platform-specific composer, not a locked preview.</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-navy/60">
                      <p className="font-medium">3. AI keeps collaborating</p>
                      <p className="mt-1 text-warm-gray">Use the chat in stage 2 to tighten wording, change tone, or try a different angle.</p>
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
        title="Delete Draft"
        onConfirm={() => void handleDeleteDraft()}
        confirmText={deleteDraftMutation.isPending ? 'Deleting...' : 'Delete Draft'}
        confirmVariant="danger"
      >
        <div className="space-y-3 text-sm text-slate-navy dark:text-white/85">
          <p>Delete this saved draft?</p>
          <p className="text-warm-gray dark:text-white/65">This will remove the draft and any uploaded media attached to it. This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
