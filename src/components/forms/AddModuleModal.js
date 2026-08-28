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
export default function AddModuleModal({ open, onOpenChange, defaultCourseId }) {
    const { addModule } = useContent();
    const { register, handleSubmit, reset, formState: { errors }, } = useForm({
        defaultValues: { title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" },
    });
    useEffect(() => {
        if (open)
            reset({ title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" });
    }, [open, defaultCourseId, reset]);
    function onSubmit(values) {
        addModule(values);
        toast.success(`Module "${values.title}" added`);
        onOpenChange(false);
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "New Module" }), _jsx(DialogDescription, { children: "Add a new module to a course." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(Input, { label: "Module title", placeholder: "e.g. Advanced Prompting", error: errors.title?.message, ...register("title", { required: "Title is required" }) }), _jsx(Select, { label: "Course", ...register("courseId", { required: true }), children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Add Module" })] })] })] }) }));
}
