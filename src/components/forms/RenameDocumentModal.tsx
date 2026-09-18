import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { updateDocumentApi, type BackendDocumentItem } from "@/services/api";

interface RenameDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: BackendDocumentItem | null;
  onSuccess?: () => void;
}

export default function RenameDocumentModal({
  open,
  onOpenChange,
  document,
  onSuccess,
}: RenameDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(document?.title || "");
      setError(null);
    }
  }, [open, document]);

  async function handleSubmit() {
    if (!document) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await updateDocumentApi(document.id, trimmed);
      if (response.success) {
        toast.success("Material updated successfully.");
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError(response.message || "Failed to update material.");
        toast.error(response.message || "Failed to update material.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update material.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Material</DialogTitle>
          <DialogDescription>Update this material's title.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Document title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
