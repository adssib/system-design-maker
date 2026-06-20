export function encodeShare(d) {
    const json = JSON.stringify({ s: d.structureText, f: d.flowText });
    return "d=" + btoa(unescape(encodeURIComponent(json)));
}
export function decodeShare(hash) {
    try {
        const raw = hash.replace(/^#/, "");
        const m = raw.match(/(?:^|&)d=([^&]+)/);
        if (!m)
            return null;
        const json = decodeURIComponent(escape(atob(m[1])));
        const obj = JSON.parse(json);
        if (typeof obj.s !== "string" || typeof obj.f !== "string")
            return null;
        return { structureText: obj.s, flowText: obj.f };
    }
    catch {
        return null;
    }
}
