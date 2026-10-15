import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/google-genai';

/**
 * Gemini on Vertex AI, authenticated with Application Default Credentials — the App
 * Hosting service account in production (granted roles/aiplatform.user), `gcloud auth
 * application-default login` locally. No API key to configure or leak.
 */
function projectId(): string | undefined {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG ?? '{}').projectId;
  } catch {
    return undefined;
  }
}

export const ai = genkit({
  plugins: [vertexAI({ projectId: projectId(), location: 'global' })],
  model: 'vertexai/gemini-2.5-flash',
});
