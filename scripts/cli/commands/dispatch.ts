import { defineCommand } from "citty";

export const truexCommand = defineCommand({
  meta: {
    name: "truex",
    description: "truex command",
  },

  async run(ctx) {
    // TODO: implement truex.
    console.log("Subcommand truex is wired.");
  },
});

export default truexCommand;
