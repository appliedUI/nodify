import { marked } from 'marked';

document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const buttons = {
    h1: document.getElementById('h1'),
    h2: document.getElementById('h2'),
    h3: document.getElementById('h3'),
    bold: document.getElementById('bold'),
    italic: document.getElementById('italic'),
    blockquote: document.getElementById('blockquote'),
    link: document.getElementById('link'),
    list: document.getElementById('list'),
    print: document.getElementById('print')
  };

  function updatePreview() {
    try {
      const markdown = editor.value;
      preview.innerHTML = marked(markdown);
    } catch (error) {
      preview.innerHTML = '<p class="error">Error parsing markdown</p>';
    }
  }

  function insertText(before, after = '') {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selection = editor.value.substring(start, end);
    const newText = before + selection + after;
    editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
    updatePreview();
    editor.focus();
  }

  buttons.h1.addEventListener('click', () => insertText('# '));
  buttons.h2.addEventListener('click', () => insertText('## '));
  buttons.h3.addEventListener('click', () => insertText('### '));
  buttons.bold.addEventListener('click', () => insertText('**', '**'));
  buttons.italic.addEventListener('click', () => insertText('*', '*'));
  buttons.blockquote.addEventListener('click', () => insertText('> '));
  buttons.link.addEventListener('click', () => insertText('[', '](url)'));
  buttons.list.addEventListener('click', () => insertText('- '));
  buttons.print.addEventListener('click', () => window.print());

  editor.addEventListener('input', updatePreview);
  updatePreview();
});
