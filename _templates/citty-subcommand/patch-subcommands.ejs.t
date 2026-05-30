---
target: <%= parentFile %>
inject: true
after: "    // <citty-subcommands>"
---
<% if (lazy) { %>
    "<%= childName %>": () => import("<%= relPath %>").then((m) => m.default),
<% } else { %>
    "<%= childName %>": <%= childExport %>,
<% } %>
