import { useRef } from "react";
import { highlightDSL } from "./highlight";

// A textarea with a syntax-highlighted backdrop. The transparent textarea holds
// the real text + caret; the <pre> behind it shows the colored tokens. They use
// identical font/padding/wrapping and scroll in sync so they align exactly.
export default function CodeEditor({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);

  const sync = () => {
    if (pre.current && ta.current) {
      pre.current.scrollTop = ta.current.scrollTop;
      pre.current.scrollLeft = ta.current.scrollLeft;
    }
  };

  return (
    <div className="code-editor">
      <pre
        ref={pre}
        className="code-pre"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightDSL(value) + "\n" }}
      />
      <textarea
        ref={ta}
        className="code-ta"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onScroll={sync}
      />
    </div>
  );
}
