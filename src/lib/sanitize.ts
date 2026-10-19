/** Customer-provided free text (gift notes, comments) is stored on orders and
 *  may be displayed to admins/staff. React already escapes on render; this is
 *  defense in depth at the data layer: no control characters, no markup,
 *  collapsible whitespace, hard length cap. */
export function sanitizeText(raw: string, max = 300): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}
