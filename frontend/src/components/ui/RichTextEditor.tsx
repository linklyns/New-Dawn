import 'quill/dist/quill.snow.css';

import ReactQuill from 'react-quill-new';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'link'],
    ['clean'],
  ],
};

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'list',
  'blockquote',
  'link',
];

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ label, value, onChange, placeholder }: RichTextEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-slate-navy dark:text-white">{label}</span>}
      <div className="rich-text-editor overflow-hidden rounded-2xl border border-slate-navy/15 bg-white text-slate-navy focus-within:border-golden-honey focus-within:ring-2 focus-within:ring-golden-honey/30 dark:border-white/10 dark:bg-slate-navy dark:text-white">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="min-h-[18rem]"
        />
      </div>
    </div>
  );
}