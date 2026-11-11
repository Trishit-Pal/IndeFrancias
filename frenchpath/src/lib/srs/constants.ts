/**
 * XP credited for each graded review. The sync merge (src/lib/pwa/merge.ts) also uses it to split a
 * past day's XP into review XP and other XP, so changing it would re-value days already recorded the
 * next time two devices merge. Treat it as part of the data format.
 */
export const XP_PER_REVIEW = 5;
