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
export default function QuizFormModal({ open, onOpenChange, quiz }) {
    const { addQuiz, updateQuiz } = useContent();
    const isEditing = Boolean(quiz);
    const { register, handleSubmit, reset, formState: { errors }, } = useForm({
        defaultValues: { title: "", courseId: courses[0]?.id ?? "", questions: 10, status: "draft" },
    });
    useEffect(() => {
        if (open) {
            reset(quiz
                ? { title: quiz.title, courseId: quiz.courseId, questions: quiz.questions, status: quiz.status }
                : { title: "", courseId: courses[0]?.id ?? "", questions: 10, status: "draft" });
        }
    }, [open, quiz, reset]);
    function onSubmit(values) {
        const payload = { title: values.title, courseId: values.courseId, questions: Number(values.questions), status: values.status };
        if (quiz) {
            updateQuiz(quiz.id, payload);
            toast.success(`Quiz "${values.title}" updated`);
        }
        else {
            addQuiz(payload);
            toast.success(`Quiz "${values.title}" created`);
        }
        onOpenChange(false);
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: isEditing ? "Edit Quiz" : "Create Quiz" }), _jsx(DialogDescription, { children: isEditing ? "Update this quiz's details." : "Quizzes are auto-evaluated the moment a trainee submits." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(Input, { label: "Quiz title", placeholder: "e.g. Prompt Engineering Quiz", error: errors.title?.message, ...register("title", { required: "Title is required" }) }), _jsx(Select, { label: "Course", ...register("courseId", { required: true }), children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsx(Input, { type: "number", min: 1, label: "Number of questions", error: errors.questions?.message, ...register("questions", { required: true, min: { value: 1, message: "Must have at least 1 question" }, valueAsNumber: true }) }), _jsxs(Select, { label: "Status", ...register("status", { required: true }), children: [_jsx("option", { value: "draft", children: "Draft" }), _jsx("option", { value: "published", children: "Published" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: isEditing ? "Save Changes" : "Create Quiz" })] })] })] }) }));
}
