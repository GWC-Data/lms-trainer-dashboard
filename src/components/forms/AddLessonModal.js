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
const typeOptions = [
    { value: "video", label: "Video" },
    { value: "document", label: "Document" },
    { value: "quiz", label: "Quiz" },
    { value: "assignment", label: "Assignment" },
];
export default function AddLessonModal({ open, onOpenChange, defaultCourseId }) {
    const { modules, addLesson } = useContent();
    const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors }, } = useForm({
        defaultValues: {
            title: "",
            courseId: defaultCourseId ?? courses[0]?.id ?? "",
            moduleId: "",
            type: "video",
            duration: "",
        },
    });
    const courseId = watch("courseId");
    const type = watch("type");
    const modulesForCourse = modules.filter((m) => m.courseId === courseId);
    useEffect(() => {
        if (open) {
            const initialCourseId = defaultCourseId ?? courses[0]?.id ?? "";
            const opts = modules.filter((m) => m.courseId === initialCourseId);
            reset({ title: "", courseId: initialCourseId, moduleId: opts[0]?.id ?? "", type: "video", duration: "" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, defaultCourseId]);
    useEffect(() => {
        const opts = modules.filter((m) => m.courseId === courseId);
        if (!opts.some((m) => m.id === getValues("moduleId"))) {
            setValue("moduleId", opts[0]?.id ?? "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, modules]);
    function onSubmit(values) {
        if (!values.moduleId) {
            toast.error("This course has no modules yet — add a module first.");
            return;
        }
        addLesson({
            title: values.title,
            courseId: values.courseId,
            moduleId: values.moduleId,
            type: values.type,
            duration: values.type === "video" && values.duration ? values.duration : undefined,
        });
        toast.success(`Lesson "${values.title}" added`);
        onOpenChange(false);
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "New Lesson" }), _jsx(DialogDescription, { children: "Add a lesson to one of your modules." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(Input, { label: "Lesson title", placeholder: "e.g. Anatomy of a Good Prompt", error: errors.title?.message, ...register("title", { required: "Title is required" }) }), _jsx(Select, { label: "Course", ...register("courseId", { required: true }), children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsxs(Select, { label: "Module", error: modulesForCourse.length === 0 ? "No modules in this course yet" : undefined, ...register("moduleId", { required: true }), children: [modulesForCourse.length === 0 && _jsx("option", { value: "", children: "No modules available" }), modulesForCourse.map((m) => (_jsx("option", { value: m.id, children: m.title }, m.id)))] }), _jsx(Select, { label: "Content type", ...register("type", { required: true }), children: typeOptions.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) }), type === "video" && (_jsx(Input, { label: "Duration (optional)", placeholder: "e.g. 12:10", ...register("duration") })), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Add Lesson" })] })] })] }) }));
}
