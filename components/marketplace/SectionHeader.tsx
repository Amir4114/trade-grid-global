type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <div className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{eyebrow}</div> : null}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-base leading-7 text-neutral-600">{description}</p> : null}
    </div>
  );
}
