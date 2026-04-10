import { Bookmark, Camera, Eye, Heart, MessageCircle, MessageSquare, MoreHorizontal, Play, Repeat2, Send, ThumbsUp } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { SocialMediaDraft, SocialMediaDraftMedia } from '../../types/models';

interface SocialDraftPreviewProps {
  draft: SocialMediaDraft;
  attachments: Array<SocialMediaDraftMedia & { previewUrl?: string }>;
}

function RichBody({ html, className, fallback }: { html: string; className: string; fallback: string }) {
  const sanitizedHtml = html.trim()
    ? DOMPurify.sanitize(html)
        .replace(/<br\s*\/?>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/[\u00A0\u202F\u2007]/g, ' ')
    : '';
  const contentClassName = `${className} min-w-0 break-words [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+p]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_a]:break-all [&_a]:text-inherit [&_strong]:font-semibold [&_em]:italic`;

  if (!sanitizedHtml) {
    return <p className={contentClassName}>{fallback}</p>;
  }

  return <div className={contentClassName} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

function supportsReelTextOverlay(platform: string, mediaType: string): boolean {
  return mediaType === 'Reel' && (platform === 'Instagram' || platform === 'Facebook' || platform === 'TikTok');
}

function InstagramReelPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];

  return (
    <div className="mx-auto max-w-sm rounded-[2.25rem] bg-black p-3 text-white shadow-lg">
      <div className="relative overflow-hidden rounded-[1.9rem] bg-black">
        <MediaSurface attachment={lead} compact vertical />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 text-sm font-semibold text-white">
          <span>Reels</span>
          <Camera size={18} />
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col items-center justify-end gap-4 p-4 text-white">
          <Heart size={22} />
          <MessageCircle size={22} />
          <Send size={22} />
          <MoreHorizontal size={22} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pr-18 text-white">
          <p className="text-xs font-semibold">@newdawnph</p>
          <p className="mt-2 font-heading text-base font-semibold">{draft.headline || draft.title}</p>
          <RichBody html={draft.body} className="mt-2 text-sm leading-5 text-white/90" fallback="Your short-form caption will appear here." />
          {draft.hashtags && <p className="mt-2 text-xs text-white/80">{draft.hashtags}</p>}
          {draft.ctaText && <p className="mt-2 text-sm font-medium text-golden-honey">{draft.ctaText}</p>}
          {draft.websiteUrl && <p className="mt-1 text-xs text-white/70 underline decoration-white/30 underline-offset-2">{draft.websiteUrl}</p>}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-white/10 bg-black/65 px-4 py-3 text-white/90 backdrop-blur-sm">
          <div className="h-1 w-6 rounded-full bg-white/70" />
          <div className="h-1 w-6 rounded-full bg-white/35" />
          <div className="h-1 w-6 rounded-full bg-white/35" />
          <div className="h-1 w-6 rounded-full bg-white/35" />
          <div className="h-1 w-6 rounded-full bg-white/35" />
        </div>
      </div>
    </div>
  );
}

function TikTokShortFormPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];

  return (
    <div className="mx-auto max-w-sm rounded-[2.25rem] bg-[#0c0c0f] p-3 text-white shadow-lg">
      <div className="relative overflow-hidden rounded-[1.9rem] bg-black">
        <MediaSurface attachment={lead} compact vertical />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-6 p-4 text-sm font-semibold text-white">
          <span className="text-white/65">Following</span>
          <span>For You</span>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col items-center justify-end gap-4 p-4 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-xs font-semibold">ND</div>
          <Heart size={24} />
          <MessageCircle size={24} />
          <Bookmark size={24} />
          <Play size={24} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/45 to-transparent p-4 pr-18 text-white">
          <p className="text-xs font-semibold">newdawnph</p>
          <RichBody html={draft.body || draft.headline} className="mt-2 text-sm leading-5 text-white/92" fallback="Your short-form caption will appear here." />
          {draft.hashtags && <p className="mt-2 text-xs text-white/80">{draft.hashtags}</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
            <div className="h-2 w-2 rounded-full bg-coral-pink" />
            <span>{draft.ctaText || 'Original sound - New Dawn'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaSurface({
  attachment,
  compact = false,
  vertical = false,
}: {
  attachment?: SocialMediaDraftMedia & { previewUrl?: string };
  compact?: boolean;
  vertical?: boolean;
}) {
  const frameClass = vertical
    ? compact
      ? 'aspect-[9/16] w-full'
      : 'aspect-[9/16] w-full'
    : 'w-full';
  const mediaClass = vertical
    ? 'h-full w-full'
    : compact ? 'h-40 w-full' : 'h-64 w-full';

  if (!attachment) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-navy/15 bg-slate-navy/5 text-sm text-warm-gray dark:border-white/10 dark:bg-white/5 dark:text-white/60 ${frameClass} ${mediaClass}`}>
        No media uploaded yet
      </div>
    );
  }

  if (attachment.mediaKind === 'video') {
    return (
      <video
        controls
        src={attachment.previewUrl}
        className={`rounded-2xl bg-black object-cover ${frameClass} ${mediaClass}`}
      />
    );
  }

  if (attachment.mediaKind === 'image') {
    return (
      <img
        src={attachment.previewUrl}
        alt={attachment.fileName}
        className={`rounded-2xl object-cover ${frameClass} ${mediaClass}`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl border border-slate-navy/15 bg-slate-navy/5 text-sm text-warm-gray dark:border-white/10 dark:bg-white/5 dark:text-white/60 ${frameClass} ${mediaClass}`}>
      {attachment.fileName}
    </div>
  );
}

function InstagramDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];
  const isVerticalVideo = draft.mediaType === 'Reel';
  const showOverlayCopy = supportsReelTextOverlay(draft.platform, draft.mediaType);

  if (draft.mediaType === 'Reel') {
    return <InstagramReelPreview draft={draft} attachments={attachments} />;
  }

  return (
    <div className="mx-auto min-w-0 max-w-xl overflow-hidden rounded-[2rem] border border-slate-navy/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-navy/70">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-golden-honey via-coral-pink to-sky-blue" />
        <div>
          <p className="font-heading text-sm font-semibold text-slate-navy dark:text-white">newdawnph</p>
          <p className="text-xs text-warm-gray">{draft.campaignName || 'New Dawn Philippines'}</p>
        </div>
      </div>
      <div className="relative">
        <MediaSurface attachment={lead} vertical={isVerticalVideo} />
        {showOverlayCopy && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
            <p className="font-heading text-lg font-semibold">{draft.headline || draft.title}</p>
            <RichBody html={draft.body} className="mt-2 text-sm leading-6 text-white/90" fallback="Your AI-generated caption will appear here." />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-slate-navy dark:text-white">
        <div className="flex items-center gap-3">
          <Heart size={19} />
          <MessageCircle size={19} />
          <Send size={19} />
        </div>
        <Bookmark size={19} />
      </div>
      <div className="mt-4 space-y-2">
        {!showOverlayCopy && <p className="font-heading text-lg font-semibold text-slate-navy dark:text-white">{draft.headline || draft.title}</p>}
        {!showOverlayCopy && <RichBody html={draft.body} className="text-sm leading-6 text-slate-navy dark:text-white/90" fallback="Your AI-generated caption will appear here." />}
        {draft.hashtags && <p className="text-sm text-sky-blue-text dark:text-sky-blue">{draft.hashtags}</p>}
        {draft.ctaText && <p className="text-sm font-medium text-golden-honey-text dark:text-golden-honey">{draft.ctaText}</p>}
        {draft.websiteUrl && <p className="text-sm font-medium text-slate-navy/80 underline decoration-slate-navy/30 underline-offset-2 dark:text-white/80 dark:decoration-white/30">{draft.websiteUrl}</p>}
      </div>
    </div>
  );
}

function FacebookDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];
  const isVerticalVideo = draft.mediaType === 'Reel';
  const showOverlayCopy = supportsReelTextOverlay(draft.platform, draft.mediaType);

  if (draft.mediaType === 'Reel') {
    return <InstagramReelPreview draft={draft} attachments={attachments} />;
  }

  return (
    <div className="mx-auto min-w-0 max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-navy/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-navy/70">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-blue text-slate-navy font-heading font-bold">ND</div>
        <div>
          <p className="font-heading text-base font-semibold text-slate-navy dark:text-white">New Dawn</p>
          <p className="text-xs text-warm-gray">Suggested for supporters interested in {draft.contentTopic.toLowerCase()}</p>
        </div>
      </div>
      {!showOverlayCopy && <RichBody html={draft.body} className="mb-4 text-base leading-7 text-slate-navy dark:text-white/90" fallback="Your AI-generated copy will appear here." />}
      <div className="relative">
        <MediaSurface attachment={lead} vertical={isVerticalVideo} />
        {showOverlayCopy && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
            <p className="font-heading text-lg font-semibold">{draft.headline || draft.title}</p>
            <RichBody html={draft.body} className="mt-2 text-sm leading-6 text-white/90" fallback="Your AI-generated copy will appear here." />
          </div>
        )}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-slate-navy/10 p-3 text-sm text-warm-gray sm:grid-cols-3 dark:border-white/10 dark:text-white/70">
        <div className="flex items-center justify-center gap-2"><ThumbsUp size={16} />Like</div>
        <div className="flex items-center justify-center gap-2"><MessageSquare size={16} />Comment</div>
        <div className="flex items-center justify-center gap-2"><Repeat2 size={16} />Share</div>
      </div>
    </div>
  );
}

function TikTokDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];

  return (
    draft.mediaType === 'Reel'
      ? <TikTokShortFormPreview draft={draft} attachments={attachments} />
      : <div className="mx-auto max-w-sm rounded-[2rem] bg-slate-navy p-4 text-white shadow-lg">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-black">
            <MediaSurface attachment={lead} compact vertical />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="font-heading text-lg font-semibold">{draft.headline || draft.title}</p>
              <RichBody html={draft.body} className="mt-2 text-sm leading-6 text-white/90" fallback="Your short-form caption will appear here." />
              {draft.hashtags && <p className="mt-2 text-sm text-sky-blue">{draft.hashtags}</p>}
            </div>
            <div className="absolute bottom-4 right-3 flex flex-col items-center gap-4 text-white">
              <Heart size={20} />
              <MessageCircle size={20} />
              <Bookmark size={20} />
              <Play size={20} />
            </div>
          </div>
        </div>
  );
}

function LinkedInDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];
  const isVerticalVideo = draft.mediaType === 'Reel';

  return (
    <div className="mx-auto min-w-0 max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-navy/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-navy/70">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-navy text-white font-heading font-bold">ND</div>
        <div>
          <p className="font-heading text-base font-semibold text-slate-navy dark:text-white">New Dawn</p>
          <p className="text-xs text-warm-gray">Nonprofit organization</p>
        </div>
      </div>
      <p className="font-heading text-xl font-semibold text-slate-navy dark:text-white">{draft.headline || draft.title}</p>
      <RichBody html={draft.body} className="mt-3 text-sm leading-7 text-slate-navy dark:text-white/90" fallback="Your AI-generated LinkedIn post will appear here." />
      <div className="mt-4">
        <MediaSurface attachment={lead} compact vertical={isVerticalVideo} />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-navy/10 pt-4 text-sm text-warm-gray dark:border-white/10 dark:text-white/70">
        <div className="min-w-0">
          <span>{draft.ctaText || 'Invite professional supporters to learn more.'}</span>
          {draft.websiteUrl && <p className="mt-1 truncate text-xs text-slate-navy/70 underline decoration-slate-navy/30 underline-offset-2 dark:text-white/70 dark:decoration-white/30">{draft.websiteUrl}</p>}
        </div>
        <div className="flex items-center gap-4"><Eye size={16} /> <MessageSquare size={16} /></div>
      </div>
    </div>
  );
}

function TwitterDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];
  const isVerticalVideo = draft.mediaType === 'Reel';

  return (
    <div className="mx-auto min-w-0 max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-navy/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-navy/70">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-navy text-white font-heading font-bold">ND</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-heading text-sm font-semibold text-slate-navy dark:text-white">New Dawn</p>
            <p className="text-xs text-warm-gray">@newdawnph</p>
          </div>
          <RichBody html={draft.body || draft.headline} className="mt-2 text-sm leading-6 text-slate-navy dark:text-white/90" fallback="Your short social post appears here." />
          {lead && <div className="mt-4"><MediaSurface attachment={lead} compact vertical={isVerticalVideo} /></div>}
          <div className="mt-4 flex items-center gap-6 text-warm-gray dark:text-white/70">
            <MessageCircle size={17} />
            <Repeat2 size={17} />
            <Heart size={17} />
            <Bookmark size={17} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  const lead = attachments[0];
  const isVerticalVideo = draft.mediaType === 'Reel';

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-[#E8F5E9] p-4 shadow-sm dark:bg-[#173223]">
      <div className="rounded-[1.5rem] bg-white p-4 shadow-sm dark:bg-slate-navy/80">
        <p className="font-heading text-base font-semibold text-slate-navy dark:text-white">Broadcast draft</p>
        {lead && <div className="mt-3"><MediaSurface attachment={lead} compact vertical={isVerticalVideo} /></div>}
        <RichBody html={draft.body} className="mt-3 text-sm leading-6 text-slate-navy dark:text-white/90" fallback="Your conversational supporter update will appear here." />
        {draft.ctaText && <p className="mt-3 text-sm font-medium text-sage-green dark:text-sage-green">{draft.ctaText}</p>}
        {draft.websiteUrl && <p className="mt-1 text-sm font-medium text-slate-navy/80 underline decoration-slate-navy/30 underline-offset-2 dark:text-white/80 dark:decoration-white/30">{draft.websiteUrl}</p>}
      </div>
    </div>
  );
}

export function SocialDraftPreview({ draft, attachments }: SocialDraftPreviewProps) {
  switch (draft.platform) {
    case 'Facebook':
      return <FacebookDraftPreview draft={draft} attachments={attachments} />;
    case 'TikTok':
      return <TikTokDraftPreview draft={draft} attachments={attachments} />;
    case 'LinkedIn':
      return <LinkedInDraftPreview draft={draft} attachments={attachments} />;
    case 'Twitter':
    case 'X':
      return <TwitterDraftPreview draft={draft} attachments={attachments} />;
    case 'WhatsApp':
      return <WhatsAppDraftPreview draft={draft} attachments={attachments} />;
    case 'Instagram':
    default:
      return <InstagramDraftPreview draft={draft} attachments={attachments} />;
  }
}