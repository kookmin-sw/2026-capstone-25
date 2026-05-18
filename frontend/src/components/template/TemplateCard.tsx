import type { Template } from "../../services/templates";

// §8.4 카드 — 아이콘 + 이름만. 한 줄 소개·규모·예상 기간은 바텀시트에서만 보여준다.
type Props = {
  template: Template;
  onSelect: (template: Template) => void;
};

export default function TemplateCard({ template, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="w-full bg-sf border border-bd2 rounded-xl px-3 py-4 hover:border-ac hover:bg-ac-s/30 transition-colors cursor-pointer flex flex-col items-center gap-2"
    >
      <span className="text-2xl leading-none" aria-hidden>
        {template.icon}
      </span>
      <span className="text-sm font-black text-tx text-center leading-snug break-keep">
        {template.name}
      </span>
    </button>
  );
}
