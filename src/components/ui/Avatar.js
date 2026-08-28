import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { cn } from "@/lib/utils";
const PALETTE = [
    "bg-[#FBECE7] text-[#C26D4D]",
    "bg-emerald-50 text-emerald-700",
    "bg-sky-50 text-sky-700",
    "bg-violet-50 text-violet-700",
    "bg-amber-50 text-amber-700",
];
function hashIndex(seed, mod) {
    let h = 0;
    for (let i = 0; i < seed.length; i++)
        h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return h % mod;
}
export function Avatar({ initials, src, className }) {
    const tone = PALETTE[hashIndex(initials, PALETTE.length)];
    const [imgFailed, setImgFailed] = useState(false);
    if (src && !imgFailed) {
        return (_jsx("img", { src: src, alt: initials, onError: () => setImgFailed(true), className: cn("h-9 w-9 shrink-0 rounded-full object-cover", className) }));
    }
    return (_jsx("div", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", tone, className), children: initials }));
}
// Deterministic per-person placeholder photo from pravatar.cc — same seed always
// resolves to the same picture, so a trainee's avatar stays stable across renders.
export function avatarUrlFor(seed, size = 150) {
    return `https://i.pravatar.cc/${size}?u=${encodeURIComponent(seed)}`;
}
