#!/usr/bin/env tsx
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "truex",
    version: "0.1.0",
    description: "Truex operator CLI",
  },

  subCommands: {
    // <citty-subcommands>

    "supa": () => import("./cli/commands/supa").then((m) => m.default),

    "smoke": () => import("./cli/commands/smoke").then((m) => m.default),

    "edge": () => import("./cli/commands/edge").then((m) => m.default),

    "pack": () => import("./cli/commands/pack").then((m) => m.default),

    "replay": () => import("./cli/commands/replay").then((m) => m.default),

    "truex": () => import("./cli/commands/truex").then((m) => m.default),

    "explain": () => import("./cli/commands/explain").then((m) => m.default),

    "telco": () => import("./cli/commands/telco").then((m) => m.default),

    "wizard": () => import("./cli/commands/wizard").then((m) => m.default),

    "doctor": () => import("./cli/commands/doctor").then((m) => m.default),
  },
});

runMain(main);
