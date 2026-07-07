import { Extension, Mark } from "@tiptap/core";

/**
 * FontSize — extends TextStyle mark with a `fontSize` attribute.
 * Requires TextStyle to already be registered (it is, via Color).
 * Applies inline style: `font-size: 14px`.
 */
export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/**
 * LineHeight — applies line-height to paragraph and heading nodes.
 */
export const LineHeight = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          commands.updateAttributes("paragraph", { lineHeight }) ||
          commands.updateAttributes("heading", { lineHeight }),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          commands.updateAttributes("paragraph", { lineHeight: null }) ||
          commands.updateAttributes("heading", { lineHeight: null }),
    };
  },
});

/**
 * TextCase — transforms selected text to UPPERCASE, lowercase, or Title Case
 * by replacing the text content of selected nodes. Not a mark — applies
 * destructively to the text, which is the correct behavior for case conversion.
 */
export const TextCase = Extension.create({
  name: "textCase",

  addCommands() {
    const transformText = (transform) => ({ state, dispatch }) => {
      const { from, to } = state.selection;
      const tr = state.tr;
      let applied = false;

      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) {
          const start = Math.max(from, pos);
          const end   = Math.min(to, pos + node.nodeSize);
          const slice = node.text.slice(start - pos, end - pos);
          const transformed = transform(slice);
          if (transformed !== slice) {
            tr.insertText(transformed, start, end);
            applied = true;
          }
        }
      });

      if (applied && dispatch) dispatch(tr);
      return applied;
    };

    return {
      setUpperCase: () => transformText((t) => t.toUpperCase()),
      setLowerCase: () => transformText((t) => t.toLowerCase()),
      setTitleCase: () =>
        transformText((t) =>
          t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        ),
    };
  },
});