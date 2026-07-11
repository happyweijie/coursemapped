/**
 * The scraped EduRec data uses library-catalog naming for some universities
 * ("University of Hong Kong, The"). We store and display the official
 * "The University of Hong Kong" form, but sort by the article-less part so
 * those universities don't all cluster under "T".
 */

/** "University of Hong Kong, The" → "The University of Hong Kong" */
export function formatUniversityName(raw: string): string {
  return raw.replace(/^(.+),\s*the$/i, 'The $1');
}

/** Sort key that ignores a leading article: "The X" → "X" */
export function universitySortKey(name: string): string {
  return name.replace(/^the\s+/i, '');
}
