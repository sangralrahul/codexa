/**
 * Account pages run their own quick entrance (heading → OAuth → fields, 280ms, 40ms apart;
 * `.auth-rise` in auth.css) instead of the route fade, so the form is usable at once.
 * The template still re-mounts on every navigation, which replays that entrance.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
