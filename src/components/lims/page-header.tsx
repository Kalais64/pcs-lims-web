export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[25px] font-semibold text-[#12281c]">{title}</h1>
        <p className="mt-1 text-sm text-[#5d7266]">{description}</p>
      </div>
      {actions}
    </header>
  );
}
