import * as React from "react";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "../assets/a11y-dark.min.css"; // code block syntax highlighting theme
import { CircleNotch, CheckFat, Copy } from "@phosphor-icons/react";
// import { Root } from "hast";
import mermaid from "mermaid";
import {
  Children,
  Fragment,
  createElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import Markdown from "react-markdown";
import flattenChildren from "react-keyed-flatten-children";
import rehypeHighlight from "rehype-highlight";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
// @ts-expect-error
import { HtmlGenerator, parse } from "latex.js";
// import "node_modules/latex.js/dist/css/base.css"
// import "node_modules/latex.js/dist/css/katex.css";
export const ANCHOR_CLASS_NAME =
  "font-semibold underline text-blue-700 underline-offset-[2px] decoration-1 hover:text-blue-800 transition-colors";
import Skeleton from "../components/skeleton";

// Mixing arbitrary Markdown + Capsize leads to lots of challenges
// with paragraphs and list items. This replaces paragraphs inside
// list items into divs to avoid nesting Capsize.
const rehypeListItemParagraphToDiv = () => {
  return (tree) => {
    visit(tree, "element", (element) => {
      if (element.tagName === "li") {
        element.children = element.children.map((child) => {
          if (child.type === "element" && child.tagName === "p") {
            child.tagName = "div";
          }
          return child;
        });
      }
    });
    return tree;
  };
};

export const useMarkdownProcessor = (content) => {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: "dark" });
  }, []);
  return useMemo(() => {
    return (
      <Markdown
        remarkPlugins={[
          remarkParse,
          remarkRehype,
          [rehypeHighlight, { ignoreMissing: true }],
          rehypeListItemParagraphToDiv,
          remarkGfm,
        ]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={ANCHOR_CLASS_NAME}
            >
              {children}
            </a>
          ),
          h1: ({ children, id }) => (
            <h1
              className="font-sans font-semibold text-2xl text-accent-foreground mb-6 mt-6"
              id={id}
            >
              {children}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2
              className="font-sans font-medium text-2xl text-accent-foreground mb-6 mt-6"
              id={id}
            >
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3
              className="font-sans font-semibold text-xl text-accent-foreground mb-6 mt-2"
              id={id}
            >
              {children}
            </h3>
          ),
          h4: ({ children, id }) => (
            <h4
              className="font-sans font-medium text-xl text-accent-foreground my-6"
              id={id}
            >
              {children}
            </h4>
          ),
          h5: ({ children, id }) => (
            <h5
              className="font-sans font-semibold text-lg text-accent-foreground my-6"
              id={id}
            >
              {children}
            </h5>
          ),
          h6: ({ children, id }) => (
            <h6
              className="font-sans font-medium text-lg text-accent-foreground my-6"
              id={id}
            >
              {children}
            </h6>
          ),
          p: (props) => {
            return (
              <p className="font-sans text-sm text-foreground mb-6">
                {props.children}
              </p>
            );
          },
          strong: ({ children }) => (
            <strong className="text-accent-foreground font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => <em>{children}</em>,
          code: CodeBlock,
          pre: ({ children }) => {
            return (
              <div className="relative mb-6">
                <pre className="p-4 rounded-lg text-code bg-slate-700 [&>code.hljs]:p-0 [&>code.hljs]:bg-transparent font-code text-sm flex items-start">
                  {children}
                </pre>
              </div>
            );
          },
          ul: ({ children }) => (
            <ul className="flex flex-col gap-3 text-foreground my-6 pl-3 [&_ol]:my-3 [&_ul]:my-3">
              {Children.map(
                flattenChildren(children).filter(isValidElement),
                (child, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <div className="w-1 h-1 rounded-full bg-current block shrink-0 mt-1" />
                    {child}
                  </li>
                )
              )}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex flex-col gap-3 text-foreground my-6 pl-3 [&_ol]:my-3 [&_ul]:my-3">
              {Children.map(
                flattenChildren(children).filter(isValidElement),
                (child, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <div
                      className="font-sans text-sm text-foreground font-semibold shrink-0 min-w-[1.4ch]"
                      aria-hidden
                    >
                      {index + 1}.
                    </div>
                    {child}
                  </li>
                )
              )}
            </ol>
          ),
          li: ({ children }) => (
            <div className="font-sans text-sm">{children}</div>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6">
              <table className="table-auto border-2 border-blue-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-blue-100">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-2 border-blue-200 p-2 font-sans text-sm font-semibold text-accent-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-2 border-blue-200 p-2 font-sans text-sm text-foreground">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-200 pl-2 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    );
  }, [content]);
};

const CodeBlock = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const [showMermaidPreview, setShowMermaidPreview] = useState(false);
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (copied) {
      const interval = setTimeout(() => setCopied(false), 1000);
      return () => clearTimeout(interval);
    }
  }, [copied]);

  // Highlight.js adds a `className` so this is a hack to detect if the code block
  // is a language block wrapped in a `pre` tag.
  if (className) {
    const isMermaid = className.includes("language-mermaid");
    const isLatex = className.includes("language-latex");
    if (isMermaid) {
      return (
        <div className="w-full">
          <Mermaid content={children?.toString() ?? ""} />
        </div>
      );
    } else if (isLatex) {
      return (
        <div className="w-full">
          <Latex content={children?.toString() ?? ""} />
        </div>
      );
    }
    return (
      <>
        <code
          ref={ref}
          className={`${className} flex-grow flex-shrink my-auto break-all overflow-x-scroll max-w-full`}
        >
          {children}
        </code>
        <div className="flex flex-col gap-1 flex-grow-0 flex-shrink-0">
          <button
            type="button"
            className="rounded-md p-1 text-slate-100 hover:bg-slate-600 border-2 border-slate-800 transition-colors"
            aria-label="copy code to clipboard"
            title="Copy code to clipboard"
            onClick={() => {
              if (ref.current) {
                navigator.clipboard.writeText(ref.current.innerText ?? "");
                setCopied(true);
              }
            }}
          >
            {copied ? (
              <CheckFat className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </>
    );
  } else {
    return (
      <code className="inline-block font-code bg-slate-700 text-accent-foreground p-0.5 -my-0.5 rounded">
        {children}
      </code>
    );
  }
};

const Latex = ({ content }) => {
  const [diagram, setDiagram] = useState(true);

  useEffect(() => {
    try {
      const generator = new HtmlGenerator({ hyphenate: false });
      const fragment = parse(content, { generator: generator }).domFragment();
      setDiagram(fragment.firstElementChild.outerHTML);
    } catch (error) {
      console.error(error);
      setDiagram(false);
    }
  }, [content]);

  if (diagram === true) {
    return (
      <div className="flex gap-2 items-center">
        <CircleNotch className="animate-spin w-4 h-4 text-primary" />
        <p className="font-sans text-sm text-muted-foreground">Rendering diagram...</p>
      </div>
    );
  } else if (diagram === false) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        Unable to render this diagram.
      </p>
    );
  } else {
    return <div dangerouslySetInnerHTML={{ __html: diagram ?? "" }} />;
  }
};

const Mermaid = ({ content }) => {
  const [diagram, setDiagram] = useState(true);

  useEffect(() => {
    const render = async () => {
      // Generate a random ID for mermaid to use.
      const id = `mermaid-svg-${Math.round(Math.random() * 10000000)}`;

      // Confirm the diagram is valid before rendering.
      try {
        if (await mermaid.parse(content, { suppressErrors: false })) {
          const { svg } = await mermaid.render(id, content);
          setDiagram(svg);
        } else {
          setDiagram(false);
        }
      } catch (error) {
        // console.error(error);
        setDiagram(false);
      }
    };
    render();
  }, [content]);
  if (diagram === true) {
    return (
      <div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  } else if (diagram === false) {
    // has errors
    return <div></div>;
  } else {
    return <div dangerouslySetInnerHTML={{ __html: diagram ?? "" }} />;
  }
};
