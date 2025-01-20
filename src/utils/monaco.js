import * as monaco from "monaco-editor";

// Configure Monaco Editor with Dark Modern theme
monaco.editor.defineTheme("dark-modern", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6A9955" },
    { token: "keyword", foreground: "C586C0" },
    { token: "number", foreground: "B5CEA8" },
    { token: "string", foreground: "CE9178" },
    { token: "type", foreground: "4EC9B0" },
    { token: "delimiter", foreground: "D4D4D4" },
    { token: "operator", foreground: "D4D4D4" },
    { token: "identifier", foreground: "9CDCFE" },
    { token: "function", foreground: "DCDCAA" },
    { token: "variable", foreground: "9CDCFE" },
    { token: "parameter", foreground: "9CDCFE" },
    { token: "property", foreground: "9CDCFE" },
  ],
  colors: {
    "editor.background": "#1E1E1E",
    "editor.foreground": "#D4D4D4",
    "editorCursor.foreground": "#AEAFAD",
    "editor.lineHighlightBackground": "#2A2D2E",
    "editor.selectionBackground": "#264F78",
    "editor.inactiveSelectionBackground": "#3A3D41",
    "editorIndentGuide.background": "#404040",
    "editorIndentGuide.activeBackground": "#707070",
    "editor.selectionHighlightBorder": "#51504F",
    "editor.lineHighlightBorder": "#2A2D2E",
    "editorLineNumber.foreground": "#858585",
    "editorLineNumber.activeForeground": "#C6C6C6",
    "editorGutter.background": "#1E1E1E",
    "editorWidget.background": "#252526",
    "editorWidget.border": "#454545",
    "editorHoverWidget.background": "#252526",
    "editorHoverWidget.border": "#454545",
  },
});

export default monaco;
