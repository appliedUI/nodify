import * as monaco from "monaco-editor";

// Configure Monaco Editor
monaco.editor.defineTheme("my-dark-theme", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#1a1a1a",
  },
});

export default monaco;
