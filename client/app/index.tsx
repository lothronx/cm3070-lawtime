import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProcessing } from "@/hooks/infrastructure/useProcessing";

/**
 * Main routing logic component that handles authentication state
 * and navigation decisions for the app.
 *
 * This component:
 * - Checks authentication state on mount
 * - Routes authenticated users to /(tabs)
 * - Routes unauthenticated users to /auth
 * - Shows loading state during auth check
 */
export default function IndexScreen() {
  const { isLoading, isAuthenticated, checkSession } = useAuthStore();
  const { startProcessing, stopProcessing } = useProcessing();

  // Check auth session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);


  // Control processing overlay based on loading state
  useEffect(() => {
    if (isLoading) {
      startProcessing("Checking authentication...");
    } else {
      stopProcessing();
    }
  }, [isLoading, startProcessing, stopProcessing]);

  // Handle navigation based on auth state using Redirect component
  if (!isLoading) {
    if (isAuthenticated) {
      return <Redirect href="/(tabs)" />;
    } else {
      return <Redirect href="/auth" />;
    }
  }

  // Show loading state - processing overlay handles the display
  return null;
}
