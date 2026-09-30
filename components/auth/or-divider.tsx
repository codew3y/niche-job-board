/** Visual break between the OAuth buttons and the email form. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border-base" />
      <span className="text-sm text-text-subtle">or with email</span>
      <span className="h-px flex-1 bg-border-base" />
    </div>
  );
}
