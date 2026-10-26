/**
 * Wrapper used by the route-group templates: templates re-mount on every
 * navigation, so the new page eases in instead of snapping into place.
 * Animation only (no lasting transform), so sticky and fixed children behave.
 */
export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className ? `page-enter ${className}` : "page-enter"}>{children}</div>;
}
