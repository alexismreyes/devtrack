import { describe, expect, it } from "vitest";
import pkg from "../package.json";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const packageJson = pkg as PackageJson;

describe("Q-028/Q-029 frontend dependencies and copied UI", () => {
  const all = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  it("records React Router, Tailwind, and documented shadcn peers", () => {
    expect(all["react-router"]).toBeDefined();
    expect(all["react-router-dom"]).toBeDefined();
    expect(all.tailwindcss).toBeDefined();
    expect(all["@tailwindcss/vite"]).toBeDefined();
    expect(all["class-variance-authority"]).toBeDefined();
    expect(all.clsx).toBeDefined();
    expect(all["tailwind-merge"]).toBeDefined();
    expect(all["lucide-react"]).toBeDefined();
    expect(all["@radix-ui/react-slot"]).toBeDefined();
    expect(all["@radix-ui/react-label"]).toBeDefined();
    expect(all["@radix-ui/react-dialog"]).toBeDefined();
    expect(all["@radix-ui/react-popover"]).toBeDefined();
    expect(all["@radix-ui/react-dropdown-menu"]).toBeUndefined();
    expect(all["next-themes"]).toBeUndefined();
  });

  it("records only @dnd-kit/core for Kanban drag-and-drop", () => {
    expect(all["@dnd-kit/core"]).toBeDefined();
    expect(all["@dnd-kit/sortable"]).toBeUndefined();
    expect(all["react-beautiful-dnd"]).toBeUndefined();
    expect(all["@hello-pangea/dnd"]).toBeUndefined();
    expect(all["react-dnd"]).toBeUndefined();
  });

  it("does not add a second CSS framework, router, or drag-and-drop library", () => {
    expect(all.bootstrap).toBeUndefined();
    expect(all["@mui/material"]).toBeUndefined();
    expect(all.antd).toBeUndefined();
    expect(all["styled-components"]).toBeUndefined();
    expect(all["@emotion/react"]).toBeUndefined();
    expect(all["react-beautiful-dnd"]).toBeUndefined();
    expect(all["@hello-pangea/dnd"]).toBeUndefined();
    expect(all["react-dnd"]).toBeUndefined();
    expect(all["vue-router"]).toBeUndefined();
    expect(all["next-themes"]).toBeUndefined();
    expect(all.recharts).toBeDefined();
    expect(all["chart.js"]).toBeUndefined();
    expect(all["react-chartjs-2"]).toBeUndefined();
    expect(all["@nivo/core"]).toBeUndefined();
    expect(all.nodemailer).toBeUndefined();
    expect(all.resend).toBeUndefined();
    expect(all["@sendgrid/mail"]).toBeUndefined();
  });

  it("copies only the shadcn primitives used by this chrome", () => {
    const uiFiles = Object.keys(import.meta.glob("./components/ui/*")).sort();
    expect(uiFiles).toEqual([
      "./components/ui/button.tsx",
      "./components/ui/card.tsx",
      "./components/ui/dialog.tsx",
      "./components/ui/input.tsx",
      "./components/ui/label.tsx",
      "./components/ui/popover.tsx",
      "./components/ui/textarea.tsx",
    ]);
    expect(Object.keys(import.meta.glob("./components/ui/dropdown-menu*"))).toEqual(
      [],
    );
  });

  it("does not keep ProbePage in the React app", () => {
    expect(Object.keys(import.meta.glob("./system/ProbePage*"))).toEqual([]);
  });

  it("does not add a members page", () => {
    expect(Object.keys(import.meta.glob("./routes/MembersPage*"))).toEqual([]);
    expect(Object.keys(import.meta.glob("./projects/MembersPage*"))).toEqual([]);
  });
});
