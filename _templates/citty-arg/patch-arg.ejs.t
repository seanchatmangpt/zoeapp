---
to: <%= commandFile %>
inject: true
after: "    // <citty-args>"
---
    "<%= name %>": {
      type: "<%= type %>",
      description: "<%= description %>",<% if (required) { %>
      required: true,<% } %><% if (defaultValue && defaultValue.length > 0) { %>
      default: <%= type === "boolean" ? defaultValue : `"${defaultValue}"` %>,<% } %><% if (alias && alias.length > 0 && type !== "positional") { %>
      alias: [<%= alias.split(",").map((a) => `"${a.trim()}"`).join(", ") %>],<% } %><% if (valueHint && valueHint.length > 0) { %>
      valueHint: "<%= valueHint %>",<% } %><% if (type === "enum" && enumOptions.length > 0) { %>
      options: [<%= enumOptions.split(",").map((o) => `"${o.trim()}"`).join(", ") %>],<% } %>
    },
