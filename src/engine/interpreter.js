import { edgeKey } from "../types";
export function compileFlow(steps, durationFor) {
    const events = [];
    let clock = 0;
    for (const s of steps) {
        const id = edgeKey(s.from, s.to);
        const dur = durationFor(s.from, s.to);
        if (s.kind === "call") {
            events.push({ edgeId: id, from: s.from, to: s.to, dir: "forward", startMs: clock, durMs: dur, label: s.label });
            clock += dur;
        }
        else if (s.kind === "roundtrip") {
            events.push({ edgeId: id, from: s.from, to: s.to, dir: "forward", startMs: clock, durMs: dur, label: s.label });
            events.push({ edgeId: id, from: s.to, to: s.from, dir: "back", startMs: clock + dur, durMs: dur, label: s.label });
            clock += dur * 2;
        }
        else {
            // async: spawn but do not advance the blocking clock
            events.push({ edgeId: id, from: s.from, to: s.to, dir: "forward", startMs: clock, durMs: dur, label: s.label });
        }
    }
    return events;
}
