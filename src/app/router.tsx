import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AuthPage } from "@/pages/AuthPage";
import { HomePage } from "@/pages/HomePage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LiveGamePage } from "@/pages/LiveGamePage";
import { PlayPage } from "@/pages/PlayPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { UpgradePage } from "@/pages/UpgradePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
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
