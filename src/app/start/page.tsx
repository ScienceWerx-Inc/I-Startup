import type { Metadata } from 'next';

import OnboardingPage from '@/modules/istartup-score/app/onboarding';

export const metadata: Metadata = { title: 'Submit an idea | iSTARTUP Score' };

export default function Start() {
  return <OnboardingPage />;
}
