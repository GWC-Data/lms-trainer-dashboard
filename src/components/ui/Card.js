import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }) {
    return (_jsx("div", { className: cn("rounded-2xl border border-[#F5E2DA] bg-white shadow-sm shadow-[#DE896A]/5", className), ...props }));
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { className: cn("p-5 pb-3", className), ...props });
}
export function CardTitle({ className, ...props }) {
    return _jsx("h3", { className: cn("text-base font-semibold text-[#3A2A22]", className), ...props });
}
export function CardDescription({ className, ...props }) {
    return _jsx("p", { className: cn("text-sm text-[#8C7A70]", className), ...props });
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { className: cn("p-5 pt-0", className), ...props });
}
export function CardFooter({ className, ...props }) {
    return _jsx("div", { className: cn("flex items-center p-5 pt-0", className), ...props });
}
