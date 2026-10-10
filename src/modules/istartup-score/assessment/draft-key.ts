/** localStorage key for an in-progress assessment, scoped per founder so a shared device never mixes drafts. */
export const assessmentDraftKey = (userId?: string | null) =>
  userId ? `istartup-assessment-v1:${userId}` : 'istartup-assessment-v1';
