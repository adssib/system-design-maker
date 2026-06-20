import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useAppStore, appStore } from "./store";
import Canvas from "./canvas/Canvas";
import Editors from "./editor/Editors";
import { SEED } from "./seed";
import { newProject, listProjects, saveProject, deleteProject, getLastProjectId, setLastProjectId, } from "./projects/storage";
import { decodeShare } from "./share/url";
export default function App() {
    const [projects, setProjects] = useState([]);
    const [currentId, setCurrentId] = useState(null);
    const speed = useAppStore((s) => s.speed);
    const structureText = useAppStore((s) => s.structureText);
    const flowText = useAppStore((s) => s.flowText);
    const positions = useAppStore((s) => s.positions);
    const saveTimer = useRef(0);
    // boot
    useEffect(() => {
        (async () => {
            const shared = decodeShare(location.hash);
            let all = await listProjects();
            let active;
            if (shared) {
                active = { ...newProject("Shared design"), ...shared };
                await saveProject(active);
                history.replaceState(null, "", location.pathname);
                all = await listProjects();
            }
            else {
                const lastId = await getLastProjectId();
                const found = all.find((p) => p.id === lastId);
                if (found)
                    active = found;
                else if (all.length)
                    active = all[0];
                else {
                    active = { ...newProject("Example"), ...SEED };
                    await saveProject(active);
                    all = await listProjects();
                }
            }
            setProjects(all);
            setCurrentId(active.id);
            appStore.getState().load(active.structureText, active.flowText, active.positions);
            await setLastProjectId(active.id);
        })();
    }, []);
    // debounced autosave on any design change
    useEffect(() => {
        if (!currentId)
            return;
        clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(async () => {
            const cur = projects.find((p) => p.id === currentId);
            if (!cur)
                return;
            const updated = { ...cur, structureText, flowText, positions };
            await saveProject(updated);
            setProjects((ps) => ps.map((p) => (p.id === currentId ? updated : p)));
        }, 400);
        return () => clearTimeout(saveTimer.current);
    }, [structureText, flowText, positions, currentId]); // eslint-disable-line react-hooks/exhaustive-deps
    const switchTo = async (p) => {
        setCurrentId(p.id);
        appStore.getState().load(p.structureText, p.flowText, p.positions);
        await setLastProjectId(p.id);
    };
    const createProject = async () => {
        const p = { ...newProject(`Project ${projects.length + 1}`), ...SEED };
        await saveProject(p);
        setProjects(await listProjects());
        await switchTo(p);
    };
    const removeProject = async (id) => {
        await deleteProject(id);
        const all = await listProjects();
        setProjects(all);
        if (id === currentId && all.length)
            await switchTo(all[0]);
    };
    return (_jsx(ReactFlowProvider, { children: _jsxs("div", { className: "app", children: [_jsxs("aside", { className: "sidebar", children: [_jsx("h1", { children: "system-design-maker" }), _jsxs("div", { className: "projects", children: [_jsx("select", { value: currentId ?? "", onChange: (e) => {
                                        const p = projects.find((x) => x.id === e.target.value);
                                        if (p)
                                            switchTo(p);
                                    }, children: projects.map((p) => _jsx("option", { value: p.id, children: p.name }, p.id)) }), _jsx("button", { onClick: createProject, children: "+ New" }), currentId && projects.length > 1 && (_jsx("button", { onClick: () => removeProject(currentId), children: "\uD83D\uDDD1" }))] }), _jsx(Editors, {}), _jsxs("div", { className: "transport", children: [_jsx("button", { className: "primary", onClick: () => appStore.getState().play(), children: "\u25B6 Send request" }), _jsx("button", { onClick: () => appStore.getState().stop(), children: "\u25A0 Stop" }), _jsx("button", { onClick: () => appStore.getState().autoArrange(), children: "\u2922 Arrange" })] }), _jsxs("div", { className: "row", children: [_jsx("label", { children: "Speed" }), _jsx("input", { type: "range", min: 60, max: 600, value: speed, onChange: (e) => appStore.getState().setSpeed(Number(e.target.value)) })] })] }), _jsx(Canvas, {})] }) }));
}
