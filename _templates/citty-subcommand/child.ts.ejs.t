---
to: <%= childOut %>
---
import { defineCommand } from "citty";

export const <%= childExport %> = defineCommand({
  meta: {
    name: "<%= childName %>",
    description: "<%= description %>",
  },

  async run(ctx) {
    // TODO: implement <%= childName %>.
    console.log("Subcommand <%= childName %> is wired.");
  },
});

export default <%= childExport %>;
