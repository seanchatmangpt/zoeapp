import { defineCommand } from "citty";

export const fooCmd = defineCommand({
  meta: {
    name: "foo",
    description: "foo",
  },

  async run(ctx) {
    console.log("Subcommand foo is wired.");
  },
});

export default fooCmd;
