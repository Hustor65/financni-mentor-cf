import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatChart } from './ChatChart';
import { ChatMermaid } from './ChatMermaid';

// Vytáhne čistý text kódu z children (string | string[]) bloku <code>.
function codeText(children: unknown): string {
  return Array.isArray(children) ? children.join('') : String(children ?? '');
}

type Block =
  | { kind: 'md'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

// Markdown parser tabulky neumí, proto je z textu vyjmeme a vykreslíme sami.
// Řádky uvnitř bloku kódu (```) se nechávají být.
function splitBlocks(src: string): Block[] {
  const lines = src.split('\n');
  const blocks: Block[] = [];
  let buf: string[] = [];
  let fenced = false;
  const flush = () => {
    if (buf.join('').trim()) blocks.push({ kind: 'md', text: buf.join('\n') });
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && TABLE_ROW.test(line) && i + 1 < lines.length && line.includes('|') && TABLE_RULE.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      flush();
      const head = tableCells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(tableCells(lines[i]));
        i++;
      }
      i--;
      blocks.push({ kind: 'table', head, rows });
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

// Řádek „Zdroje: a; b“ na konci odpovědi → samostatný seznam pod textem.
const SOURCES = /\n\s*(?:\*\*|__)?Zdroje:?(?:\*\*|__)?:?\s*([^\n]+?)\s*$/;

function splitSources(src: string): { body: string; sources: string[] } {
  const m = SOURCES.exec(src);
  if (!m) return { body: src, sources: [] };
  const sources = m[1].split(';').map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
  return { body: src.slice(0, m.index), sources };
}

// Číslo a jeho jednotka (0,2 %, 3 000 Kč) ani tisíce se nesmí rozdělit na konci řádku.
function tidyNumbers(src: string): string {
  return src
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00A0')
    .replace(/(\d) (?=(?:%|Kč|USD|EUR)(?![\wÀ-ž]))/g, '$1\u00A0');
}

// sloupec, ve kterém jsou jen čísla, se zarovná vpravo
const NUMERIC = /^[+\-−–]?\s?\d[\d\s\u00A0.,]*(?:\s?(?:%|Kč|USD|EUR|×|x|let|p\.\s?a\.))?$/;
function numericCols(head: string[], rows: string[][]): boolean[] {
  return head.map((_, k) => rows.length > 0 && rows.every(r => !r[k] || NUMERIC.test(r[k].replace(/\*/g, '').trim())));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const MD_COMPONENTS = {
  // ```echarts → graf, ```mermaid → diagram; ostatní bloky kódu beze změny.
  pre({ node, children, ...rest }: any) {
    void node; // 'node' není platný DOM atribut → ven z rest
    const child = Array.isArray(children) ? children[0] : children;
    const lang = child?.props?.className ?? '';
    const text = codeText(child?.props?.children);
    if (/language-echarts/.test(lang)) return <ChatChart code={text} />;
    if (/language-mermaid/.test(lang)) return <ChatMermaid code={text} />;
    return <pre {...rest}>{children}</pre>;
  },
  // odkaz z odpovědi nesmí návštěvníka odvést z rozdělané konverzace
  a({ node, children, ...rest }: any) {
    void node;
    return <a {...rest} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

// buňka tabulky: jen řádkové formátování, bez obalujícího odstavce
const CELL_COMPONENTS = {
  p({ children }: any) {
    return <>{children}</>;
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  /** hláška o chybě nebo limitu místo odpovědi */
  isError?: boolean;
  /** bez akcí pod zprávou (uvítání) */
  bare?: boolean;
  /** akce jen u POSLEDNÍ odpovědi mentora (regenerace / zjednodušení) */
  onRetry?: () => void;
  onSimplify?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isError, bare, onRetry, onSimplify }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      ?.writeText(content)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const isAssistant = role === 'assistant';

  const { blocks, sources } = useMemo(() => {
    const split = isAssistant ? splitSources(tidyNumbers(content)) : { body: content, sources: [] };
    return { blocks: splitBlocks(split.body), sources: split.sources };
  }, [content, isAssistant]);

  if (isAssistant && isError) {
    return (
      <div className="mn-msg mn-msg--assistant">
        <div className="ui-note ui-note--warn mn-msg__note" role="status">
          <p>{content}</p>
          {onRetry && (
            <button type="button" className="btn" onClick={onRetry}>
              Zkusit znovu
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`mn-msg mn-msg--${role}`}>
      <span className="sr-only">{isAssistant ? 'Mentor: ' : 'Ty: '}</span>
      <div className="mn-md">
        {blocks.map((b, i) => {
          if (b.kind === 'md') {
            return (
              <ReactMarkdown key={i} components={MD_COMPONENTS}>
                {b.text}
              </ReactMarkdown>
            );
          }
          const num = numericCols(b.head, b.rows);
          return (
            <div key={i} className="ui-table-wrap mn-table" tabIndex={0} role="group" aria-label="Tabulka">
              <table className="ui-table">
                <thead>
                  <tr>
                    {b.head.map((c, j) => (
                      <th key={j} scope="col" className={num[j] ? 'is-num' : undefined}>
                        <ReactMarkdown components={CELL_COMPONENTS}>{c}</ReactMarkdown>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {b.head.map((_, k) => (
                        <td key={k} className={num[k] ? 'is-num' : undefined}>
                          <ReactMarkdown components={CELL_COMPONENTS}>{r[k] ?? ''}</ReactMarkdown>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {sources.length > 0 && (
        <div className="mn-sources">
          <span className="mn-sources__label">Zdroje</span>
          <ul>
            {sources.map(s => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {isAssistant && content && !bare && (
        <div className="mn-msg__acts">
          <button type="button" className="mn-act" onClick={copy} aria-label="Kopírovat odpověď">
            {copied ? 'Zkopírováno' : 'Kopírovat'}
          </button>
          {onSimplify && (
            <button type="button" className="mn-act" onClick={onSimplify} aria-label="Vysvětlit jednodušeji">
              Jednodušeji
            </button>
          )}
          {onRetry && (
            <button type="button" className="mn-act" onClick={onRetry} aria-label="Vygenerovat odpověď znovu">
              Znovu
            </button>
          )}
        </div>
      )}
    </div>
  );
};
