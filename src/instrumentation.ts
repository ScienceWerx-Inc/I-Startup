import { captureRequestError, registerObservability } from "@/lib/observability/next";

// ScienceWerx observability: request metrics per route and server errors, sent to the
// portal's Monitoring page. Does nothing unless OBSERVABILITY_TOKEN is set on the server.
export const register = () => registerObservability({ project: "i-startup", service: "i-startup-web" });
export const onRequestError = captureRequestError;
