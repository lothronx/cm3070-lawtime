import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import LoadingComponent from "@/components/LoadingComponent";
import { useAppTheme } from "@/theme/ThemeProvider";

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
  const { theme } = useAppTheme();
  const router = useRouter();

  // Check auth session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth");
      }
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingComponent variant="authentication" backgroundColor={theme.colors.background} />;
  }

  // This component should never render anything else since it always redirects
  return null;
}
