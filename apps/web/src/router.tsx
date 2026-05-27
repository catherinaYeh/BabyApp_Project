import { createBrowserRouter, Outlet, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AddFeedingSheet } from '@/components/feeding/AddFeedingSheet';
import { HomePage } from '@/pages/HomePage';
import { BabiesPage } from '@/pages/BabiesPage';
import { BabyEditPage } from '@/pages/BabyEditPage';
import { StubPage } from '@/pages/StubPage';

function Root() {
  return (
    <AppShell>
      <Outlet />
      <AddFeedingSheet />
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
      { path: '/foods', element: <StubPage title="食材圖鑑（Phase 11.3）" /> },
      { path: '/history', element: <StubPage title="歷史視圖（Phase 11.5）" /> },
      { path: '/achievements', element: <StubPage title="徽章牆（Phase 11.7）" /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
