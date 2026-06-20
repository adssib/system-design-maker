import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAppStore, appStore } from "../store";
export default function Editors() {
    const [tab, setTab] = useState("structure");
    const structureText = useAppStore((s) => s.structureText);
    const flowText = useAppStore((s) => s.flowText);
    const structure = useAppStore((s) => s.structure);
    const flow = useAppStore((s) => s.flow);
    const validation = useAppStore((s) => s.validation);
    const isStructure = tab === "structure";
    const value = isStructure ? structureText : flowText;
    const onChange = (v) => isStructure ? appStore.getState().setStructureText(v) : appStore.getState().setFlowText(v);
    const errors = isStructure ? structure.errors : [...flow.errors, ...validation];
    return (_jsxs("div", { className: "editors", children: [_jsxs("div", { className: "tabs", children: [_jsx("button", { className: isStructure ? "active" : "", onClick: () => setTab("structure"), children: "Structure" }), _jsx("button", { className: !isStructure ? "active" : "", onClick: () => setTab("flow"), children: "Flow" })] }), _jsx("textarea", { spellCheck: false, value: value, onChange: (e) => onChange(e.target.value) }), _jsx("div", { className: "errors", children: errors.map((er, i) => (_jsxs("div", { className: "error", children: ["\u26A0 line ", er.line, ": ", er.message] }, i))) })] }));
}
