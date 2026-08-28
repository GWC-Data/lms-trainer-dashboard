import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { courses } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
function formatDueDate(isoDate) {
    const date = new Date(`${isoDate}T00:00:00`);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
}
export default function AddAssignmentModal({ open, onOpenChange }) {
    const { addAssignment } = useContent();
    const { register, handleSubmit, reset, formState: { errors }, } = useForm({
        defaultValues: { title: "", courseId: courses[0]?.id ?? "", dueDate: "" },
    });
    useEffect(() => {
        if (open)
            reset({ title: "", courseId: courses[0]?.id ?? "", dueDate: "" });
    }, [open, reset]);
    function onSubmit(values) {
        addAssignment({ title: values.title, courseId: values.courseId, dueDate: formatDueDate(values.dueDate) });
        toast.success(`Assignment "${values.title}" created`);
        onOpenChange(false);
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Create Assignment" }), _jsx(DialogDescription, { children: "Trainees will submit work for you to review and score." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(Input, { label: "Assignment title", placeholder: "e.g. Build Your First Claude Prompt Library", error: errors.title?.message, ...register("title", { required: "Title is required" }) }), _jsx(Select, { label: "Course", ...register("courseId", { required: true }), children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsx(Input, { type: "date", label: "Due date", error: errors.dueDate?.message, ...register("dueDate", { required: "Due date is required" }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Create Assignment" })] })] })] }) }));
}
