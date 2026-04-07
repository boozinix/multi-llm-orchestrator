import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { AddCard } from "./components/AddCard";
import { AdminScraper } from "./components/AdminScraper";
import { Settings } from "./components/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "add-card", Component: AddCard },
      { path: "admin", Component: AdminScraper },
      { path: "settings", Component: Settings },
    ],
  },
]);
