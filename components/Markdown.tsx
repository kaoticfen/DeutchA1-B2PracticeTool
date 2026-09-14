import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders authored grammar content. Tables matter here (case endings,
 * conjugations), so GFM is enabled.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: (p) => <h2 className="mt-6 mb-2 text-lg font-semibold" {...p} />,
          h3: (p) => <h3 className="mt-5 mb-2 font-semibold" {...p} />,
          p: (p) => <p className="mb-3 leading-relaxed" {...p} />,
          ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...p} />,
          strong: (p) => <strong className="font-semibold" {...p} />,
          code: (p) => (
            <code
              className="rounded px-1.5 py-0.5 text-[0.9em]"
              style={{ background: "var(--surface-2)" }}
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="mb-3 border-l-2 pl-3 italic"
              style={{ borderColor: "var(--color-brand-500)", color: "var(--text-muted)" }}
              {...p}
            />
          ),
          table: (p) => (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th
              className="border px-3 py-2 text-left font-semibold"
              style={{ background: "var(--surface-2)" }}
              {...p}
            />
          ),
          td: (p) => <td className="border px-3 py-2 align-top" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
