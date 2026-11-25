/**
 * ScienceWerx Connect v1 — the wire shapes shared by every ScienceWerx product.
 *
 * Each app keeps its own database and sign-in; apps share a display-ready summary of
 * the person signed in to the caller, server to server, matched by verified email.
 */

export const CONNECT_SCOPES = ['summary', 'certificates'] as const;
export type ConnectScope = (typeof CONNECT_SCOPES)[number];

/** The apps that speak Connect, and how they're named on screen. */
export const CONNECT_APPS = {
  prismscore: 'Prism School',
  istartup: 'iStartup',
  founderfit: 'FounderFit',
  inkeep: 'InkKeep',
  inkguard: 'InkGuard',
} as const;
export type ConnectApp = keyof typeof CONNECT_APPS;

export const isConnectApp = (name: string): name is ConnectApp => Object.hasOwn(CONNECT_APPS, name);

/** This app's name on the wire. */
export const SELF: ConnectApp = 'istartup';

export interface ConnectCardLine {
  label: string;
  value: string;
}

export interface ConnectCard {
  title: string;
  headline: string;
  /** At most 5, plain text, values ≤ 120 characters. */
  lines: ConnectCardLine[];
  url: string;
  updatedAt: string;
}

export type CertificateStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

export interface ConnectCertificate {
  code: string;
  title: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string | null;
  status: CertificateStatus;
  verifyUrl: string;
}

export type SummaryResponse =
  | { app: string; found: false }
  | { app: string; found: true; card: ConnectCard };

export type CertificatesResponse =
  | { app: string; found: false }
  | { app: string; found: true; certificates: ConnectCertificate[] };

/** What `/api/connect/peers` hands the browser: answers from the peers that replied, merged. */
export interface PeerCard extends ConnectCard {
  app: ConnectApp;
  appName: string;
}

export interface PeerCertificate extends ConnectCertificate {
  app: ConnectApp;
}

export interface PeersResponse {
  cards: PeerCard[];
  certificates: PeerCertificate[];
  /** True when the signed-in founder must verify their email before peers are asked. */
  needsVerification?: boolean;
}

export const MAX_LINES = 5;
export const MAX_LINE_VALUE = 120;
