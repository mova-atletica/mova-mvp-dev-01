import Link from "next/link";
import type { ReactNode } from "react";

function linkNode(key: number, href: string, label: ReactNode) {
  const isHash = href.startsWith("#");
  const isInternal = href.startsWith("/");
  const className = "underline";
  const style = { color: "var(--accent, #3b82f6)" };

  if (isInternal) {
    return (
      <Link key={key} href={href} className={className} style={style}>
        {label}
      </Link>
    );
  }

  return (
    <a
      key={key}
      href={href}
      className={className}
      style={style}
      target={href.startsWith("http") && !isHash ? "_blank" : undefined}
      rel={href.startsWith("http") && !isHash ? "noopener noreferrer" : undefined}
    >
      {label}
    </a>
  );
}

function inlineFormat(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\*\*[^*]+?\*\*|\*[^*]+?\*|<https?:\/\/[^>]+>|\[([^\]]+)\]\(([^)]+)\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("<http")) {
      const href = token.slice(1, -1);
      nodes.push(linkNode(key++, href, href));
    } else if (token.startsWith("[")) {
      const label = match[2];
      let href = match[3];
      if (href.includes("@") && !href.startsWith("mailto:") && !href.startsWith("http") && !href.startsWith("/") && !href.startsWith("#")) {
        href = `mailto:${href}`;
      }
      nodes.push(linkNode(key++, href, label));
    } else if (token.includes("@") && !token.startsWith("http")) {
      nodes.push(linkNode(key++, `mailto:${token}`, token));
    } else {
      nodes.push(linkNode(key++, token, token));
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseHeading(text: string): { title: string; id: string } {
  const withId = text.match(/^(.*?)\s*\{#([A-Za-z0-9_-]+)\}\s*$/);
  if (withId) {
    const title = withId[1].replace(/\*\*/g, "").trim();
    return { title, id: withId[2] };
  }
  const title = text.replace(/\*\*/g, "").trim();
  return { title, id: slugify(title) };
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}.*\|/.test(line.trim());
}

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

/** Minimal markdown renderer for hosted legal documents (headings, lists, tables, paragraphs, bold, links). */
export default function LegalMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const standaloneId = trimmed.match(/^\{#([A-Za-z0-9_-]+)\}$/);
    if (standaloneId) {
      blocks.push(<span key={key++} id={standaloneId[1]} className="scroll-mt-24" />);
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const { title, id } = parseHeading(heading[2]);
      if (level === 1) {
        i += 1;
        continue;
      }
      if (level === 2) {
        blocks.push(
          <h2 key={key++} id={id} className="mt-10 mb-3 text-lg font-semibold tracking-tight scroll-mt-24">
            {title}
          </h2>
        );
      } else {
        blocks.push(
          <h3 key={key++} id={id} className="mt-6 mb-2 text-base font-semibold tracking-tight scroll-mt-24">
            {title}
          </h3>
        );
      }
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t.startsWith("|")) break;
        if (!isTableSeparator(t)) {
          rows.push(splitRow(t));
        }
        i += 1;
      }
      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1);
        blocks.push(
          <div key={key++} className="mb-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm" style={{ color: "var(--section-subtitle)" }}>
              <thead>
                <tr>
                  {header.map((cell, idx) => (
                    <th
                      key={idx}
                      className="border px-3 py-2 font-semibold"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      {inlineFormat(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {header.map((_, cIdx) => (
                      <td key={cIdx} className="border px-3 py-2 align-top" style={{ borderColor: "var(--border)" }}>
                        {inlineFormat(row[cIdx] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\\?-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const m = t.match(/^[-*]\s+(.+)$/) || t.match(/^\\?-\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="mb-4 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: "var(--section-subtitle)" }}>
          {items.map((item, idx) => (
            <li key={idx}>{inlineFormat(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered TOC-style lines "1. TITLE" that are not full paragraphs
    const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numbered && numbered[2] === numbered[2].toUpperCase() && numbered[2].length < 80) {
      const items: { n: string; label: string }[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const m = t.match(/^(\d+)\.\s+(.+)$/);
        if (!m || m[2] !== m[2].toUpperCase() || m[2].length >= 80) break;
        items.push({ n: m[1], label: m[2] });
        i += 1;
      }
      blocks.push(
        <ol key={key++} className="mb-6 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed" style={{ color: "var(--section-subtitle)" }}>
          {items.map((item) => (
            <li key={item.n}>
              <a href={`#${slugify(`${item.n}. ${item.label}`)}`} className="hover:underline" style={{ color: "var(--accent, #3b82f6)" }}>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || t.startsWith("#") || t.startsWith("|") || t.startsWith("{#") || /^[-*]\s+/.test(t) || /^\\?-\s+/.test(t)) break;
      const n = t.match(/^(\d+)\.\s+(.+)$/);
      if (n && n[2] === n[2].toUpperCase() && n[2].length < 80) break;
      para.push(t);
      i += 1;
    }
    const joined = para.join(" ");
    const isAllCaps = joined === joined.toUpperCase() && joined.length > 40;
    blocks.push(
      <p
        key={key++}
        className={`mb-4 text-sm leading-relaxed ${isAllCaps ? "tracking-wide" : ""}`}
        style={{ color: "var(--section-subtitle)" }}
      >
        {inlineFormat(joined)}
      </p>
    );
  }

  return <div className="legal-markdown">{blocks}</div>;
}
