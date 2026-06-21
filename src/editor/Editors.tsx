import { useState } from "react";
import { useAppStore, appStore } from "../store";
import CodeEditor from "./CodeEditor";

export default function Editors() {
  const [tab, setTab] = useState<"structure" | "flow">("structure");
  const structureText = useAppStore((s) => s.structureText);
  const flowText = useAppStore((s) => s.flowText);
  const structure = useAppStore((s) => s.structure);
  const flowErrors = useAppStore((s) => s.flowErrors);
  const validation = useAppStore((s) => s.validation);

  const isStructure = tab === "structure";
  const value = isStructure ? structureText : flowText;
  const onChange = (v: string) =>
    isStructure ? appStore.getState().setStructureText(v) : appStore.getState().setFlowText(v);

  const errors = isStructure ? structure.errors : [...flowErrors, ...validation];

  return (
    <div className="editors">
      <div className="tabs">
        <button className={isStructure ? "active" : ""} onClick={() => setTab("structure")}>Structure</button>
        <button className={!isStructure ? "active" : ""} onClick={() => setTab("flow")}>Flow</button>
      </div>
      <CodeEditor
        value={value}
        onChange={onChange}
        placeholder={isStructure ? "client -> gateway" : 'flow "GET /x":\n  client -> gateway'}
      />
      <div className="errors">
        {errors.map((er, i) => (
          <div key={i} className="error">⚠ line {er.line}: {er.message}</div>
        ))}
      </div>
    </div>
  );
}
