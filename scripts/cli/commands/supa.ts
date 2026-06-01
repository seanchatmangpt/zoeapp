import { defineCommand } from "citty";

export const supaCommand = defineCommand({
  meta: {
    name: "supa",
    description: "supa command",
  },

  async run(ctx) {
    console.log("Subcommand supa is wired.");
  },
});

export default supaCommand;
