import { CATEGORY_ICONS, CATEGORY_ICON_VIEWBOX, type CategoryIconId } from "@/lib/icons/category-icons.generated";

/**
 * Inline category icon. The markup comes from the build-time generated module
 * (validated against an SVG allowlist) — never from user input.
 */
export function CategoryIcon({ id, className }: { id: string; className?: string }) {
  const body = CATEGORY_ICONS[id as CategoryIconId];
  if (!body) return null;
  return (
    <svg
      className={className}
      viewBox={CATEGORY_ICON_VIEWBOX}
      fill="none"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
