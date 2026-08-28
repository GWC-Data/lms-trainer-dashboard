import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function ProgressBar({ value, className, trackClassName, barClassName }) {
    const clamped = Math.max(0, Math.min(100, value));
    return (_jsx("div", { className: cn("h-2 w-full overflow-hidden rounded-full bg-[#F5E2DA]", trackClassName, className), children: _jsx("div", { className: cn("h-full rounded-full bg-[#DE896A] transition-all duration-500", barClassName), style: { width: `${clamped}%` } }) }));
}
export function RadialProgress({ value, size = 96, strokeWidth = 8, label, sublabel }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, value));
    const offset = circumference - (clamped / 100) * circumference;
    return (_jsxs("div", { className: "relative", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, className: "-rotate-90", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "rgba(255,255,255,0.25)", strokeWidth: strokeWidth }), _jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "white", strokeWidth: strokeWidth, strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: offset, className: "transition-all duration-700 ease-out" })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [label && _jsx("span", { className: "text-lg font-bold text-white leading-none", children: label }), sublabel && _jsx("span", { className: "mt-1 text-[10px] text-white/80", children: sublabel })] })] }));
}
