import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import {
  mapProgressData,
  mapProjectsPieData,
  mapTasksBarsData,
  truncateProjectLabel,
} from "./dashboardChartData";

type PackageJson = {
  dependencies?: Record<string, string>;
};

const packageJson = pkg as PackageJson;

describe("dashboardChartData", () => {
  it("maps projectsPie slices by status key and label", () => {
    expect(
      mapProjectsPieData([
        { statusKey: "DONE", label: "Done", count: 3 },
        { statusKey: "CUSTOM", label: "Custom", count: 1 },
      ]),
    ).toEqual([
      { statusKey: "DONE", name: "Done", value: 3 },
      { statusKey: "CUSTOM", name: "Custom", value: 1 },
    ]);
  });

  it("maps tasksBars checklist completion percents", () => {
    expect(
      mapTasksBarsData([
        {
          projectId: "proj-1",
          projectName: "Alpha",
          checklistCompletionPercent: 50,
        },
        {
          projectId: "proj-2",
          projectName: "Beta",
          checklistCompletionPercent: 0,
        },
      ]),
    ).toEqual([
      {
        projectId: "proj-1",
        name: "Alpha",
        checklistCompletionPercent: 50,
      },
      {
        projectId: "proj-2",
        name: "Beta",
        checklistCompletionPercent: 0,
      },
    ]);
  });

  it("maps progress completed/total into a completion percent", () => {
    expect(
      mapProgressData([
        {
          projectId: "proj-1",
          projectName: "Alpha",
          completedTasks: 3,
          totalTasks: 5,
        },
        {
          projectId: "proj-2",
          projectName: "Beta",
          completedTasks: 0,
          totalTasks: 0,
        },
      ]),
    ).toEqual([
      {
        projectId: "proj-1",
        name: "Alpha",
        completedTasks: 3,
        totalTasks: 5,
        completionPercent: 60,
      },
      {
        projectId: "proj-2",
        name: "Beta",
        completedTasks: 0,
        totalTasks: 0,
        completionPercent: 0,
      },
    ]);
  });

  it("truncates long project labels for chart axes", () => {
    expect(truncateProjectLabel("Short")).toBe("Short");
    expect(truncateProjectLabel("A very long project name")).toBe(
      "A very long pro…",
    );
  });

  it("documents recharts as the only chart library dependency for this feature", () => {
    expect(packageJson.dependencies?.recharts).toEqual(expect.any(String));
    expect(packageJson.dependencies?.["chart.js"]).toBeUndefined();
    expect(packageJson.dependencies?.["@nivo/core"]).toBeUndefined();
  });
});
