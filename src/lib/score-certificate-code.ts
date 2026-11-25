/** The Readiness Certificate's number, derived from its report: stable, never stored. */
export const scoreCertificateCode = (reportId: string) => `IS-${reportId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
