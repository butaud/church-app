import type { ReactNode } from "react";

// Supports **bold**, *italic* or _italic_, and [text](url) links.
export function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      tokens.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      tokens.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      tokens.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4] !== undefined && match[5] !== undefined) {
      tokens.push(
        <a
          key={key++}
          href={match[5]}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 underline"
        >
          {match[4]}
        </a>,
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}
