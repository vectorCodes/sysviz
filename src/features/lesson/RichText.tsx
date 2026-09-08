import { Fragment, type ReactNode } from 'react'

/**
 * Minimal inline formatter for deep-dive prose: `**bold**` and `` `code` ``.
 * Deliberately tiny — lesson copy is authored by us, not user input, so a full
 * markdown dependency would be dead weight.
 */
export function RichText({ text }: { text: string }) {
  return <>{parse(text)}</>
}

const PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g

function parse(text: string): ReactNode[] {
  return text.split(PATTERN).map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-text">
          {chunk.slice(2, -2)}
        </strong>
      )
    }
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length > 1) {
      return (
        <code
          key={i}
          className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-400"
        >
          {chunk.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={i}>{chunk}</Fragment>
  })
}
