import { run, opencode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execFileSync } from "node:child_process";

type Issue = {
  number: number;
  title: string;
};

const issues = JSON.parse(
  execFileSync(
    "gh",
    [
      "issue",
      "list",
      "--state",
      "open",
      "--label",
      "ready-for-agent",
      "--limit",
      "100",
      "--json",
      "number,title",
    ],
    { encoding: "utf8" },
  ),
) as Issue[];

if (issues.length === 0) {
  console.log("No ready-for-agent issues found.");
  process.exit(0);
}

for (const issue of issues) {
  const branch = `ralph/issue-${issue.number}-${slugify(issue.title)}`;

  console.log(`Starting #${issue.number}: ${issue.title}`);

  await run({
    name: `issue-${issue.number}`,
    sandbox: docker({
      mounts: [
        {
          hostPath: "~/.local/share/opencode/auth.json",
          sandboxPath: "/home/agent/.local/share/opencode/auth.json",
          readonly: true,
        },
      ],
    }),
    agent: opencode("openai/gpt-5.5"),
    promptFile: "./.sandcastle/prompt.md",
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
    },
    maxIterations: 1,
    branchStrategy: { type: "branch", branch },
    hooks: {
      sandbox: {
        onSandboxReady: [{ command: "pnpm install" }],
      },
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
