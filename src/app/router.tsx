import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { AuthPage } from "@/pages/AuthPage";
import { HomePage } from "@/pages/HomePage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LiveGamePage } from "@/pages/LiveGamePage";
import { PlayPage } from "@/pages/PlayPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";
import { UpgradePage } from "@/pages/UpgradePage";

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    path: "/",
    element: <HomePage />,
  },
  {
    errorElement: <RouteErrorPage />,
    path: "/auth",
    element: <AuthPage />,
  },
  {
    errorElement: <RouteErrorPage />,
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    errorElement: <RouteErrorPage />,
    element: <AppShell />,
    children: [
      {
        path: "play",
        element: <PlayPage />,
      },
      {
        path: "live",
        element: <LiveGamePage />,
      },
      {
        path: "live/:gameId",
        element: <LiveGamePage />,
      },
      {
        path: "review",
        element: <ReviewPage />,
      },
      {
        path: "leaderboard",
        element: <LeaderboardPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "upgrade",
        element: <UpgradePage />,
      },
    ],
  },
]);
