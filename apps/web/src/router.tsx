import { createBrowserRouter, Outlet, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AddFeedingSheet } from '@/components/feeding/AddFeedingSheet';
import { BadgeUnlockToast } from '@/components/achievement/BadgeUnlockToast';
import { HomePage } from '@/pages/HomePage';
import { BabiesPage } from '@/pages/BabiesPage';
import { BabyEditPage } from '@/pages/BabyEditPage';
import { FoodCatalogPage } from '@/pages/FoodCatalogPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { ImportPage } from '@/pages/ImportPage';
import { SettingsPage } from '@/pages/SettingsPage';

function Root() {
  return (
    <AppShell>
      <Outlet />
      <AddFeedingSheet />
      <BadgeUnlockToast />
    </AppShell>
  );
}

const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/babies', element: <BabiesPage /> },
      { path: '/babies/new', element: <BabyEditPage /> },
      { path: '/babies/:babyId/edit', element: <BabyEditPage /> },
      { path: '/foods', element: <FoodCatalogPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/achievements', element: <AchievementsPage /> },
      { path: '/import', element: <ImportPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
