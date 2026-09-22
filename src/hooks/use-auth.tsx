export function useAuth() { return { user: { uid: "123", email: "test@example.com", customClaims: { role: "admin" } }, isLoading: false, hasRole: () => true }; }
