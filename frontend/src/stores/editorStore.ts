import { create } from 'zustand';

interface EditorState {
  platform: string;
  headline: string;
  body: string;
  mediaType: string;
  callToAction: string;
  ctaType: string;
  contentTopic: string;
  sentimentTone: string;
  scheduledDay: string | null;
  scheduledHour: number | null;
  hashtags: string;
  captionLength: number;
  updateField: (field: string, value: string | number | null) => void;
  applyCommand: (command: { action: string; value: string }) => void;
  resetEditor: () => void;
}

const initialState = {
  platform: 'Instagram',
  headline: '',
  body: '',
  mediaType: 'Photo',
  callToAction: '',
  ctaType: 'None',
  contentTopic: 'Fundraising',
  sentimentTone: 'Informational',
  scheduledDay: null as string | null,
  scheduledHour: null as number | null,
  hashtags: '',
  captionLength: 0,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,
  updateField: (field, value) =>
    set((state) => {
      const next = { ...state, [field]: value };
      if (field === 'body' && typeof value === 'string') {
        next.captionLength = value.length;
      }
      return next;
    }),
  applyCommand: (command) =>
    set((state) => {
      switch (command.action) {
        case 'updateHeadline':
          return { ...state, headline: command.value };
        case 'changePlatform':
          return { ...state, platform: command.value };
        case 'updateBody':
          return { ...state, body: command.value, captionLength: command.value.length };
        case 'setSentimentTone':
          return { ...state, sentimentTone: command.value };
        case 'setCtaType':
          return { ...state, ctaType: command.value };
        case 'setMediaType':
          return { ...state, mediaType: command.value };
        case 'setContentTopic':
          return { ...state, contentTopic: command.value };
        default:
          return state;
      }
    }),
  resetEditor: () => set(initialState),
}));
