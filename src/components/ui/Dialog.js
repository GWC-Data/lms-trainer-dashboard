import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export function DialogContent({ children, className }) {
    return (_jsxs(RadixDialog.Portal, { children: [_jsx(RadixDialog.Overlay, { className: "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" }), _jsxs(RadixDialog.Content, { className: cn("fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#F5E2DA] bg-white p-6 shadow-lg shadow-black/10 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className), children: [children, _jsx(RadixDialog.Close, { className: "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A] focus:outline-none", children: _jsx(X, { className: "h-4 w-4" }) })] })] }));
}
export function DialogHeader({ className, ...props }) {
    return _jsx("div", { className: cn("mb-4 space-y-1 pr-6", className), ...props });
}
export function DialogTitle({ className, ...props }) {
    return (_jsx(RadixDialog.Title, { className: cn("text-lg font-bold text-[#3A2A22]", className), ...props }));
}
export function DialogDescription({ className, ...props }) {
    return (_jsx(RadixDialog.Description, { className: cn("text-sm text-[#8C7A70]", className), ...props }));
}
export function DialogFooter({ className, ...props }) {
    return _jsx("div", { className: cn("mt-6 flex items-center justify-end gap-3", className), ...props });
}
