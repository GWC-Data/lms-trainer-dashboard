import { useEffect, useState } from "react";
import { Laptop, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { getDevicesApi, revokeDeviceApi, type DeviceSession } from "@/services/api";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function Settings() {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<DeviceSession | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDevicesApi();
      setDevices(res.devices || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Unable to load your logged-in devices."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  async function removeDevice(device: DeviceSession) {
    setRemovingId(device.sessionId);
    try {
      await revokeDeviceApi(device.sessionId);
      setDevices((prev) => prev.filter((d) => d.sessionId !== device.sessionId));
      toast.success(
        device.isCurrentSession ? "Signed out of this device." : `Signed out of ${device.deviceName}.`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to sign out that device.");
    } finally {
      setRemovingId(null);
      setConfirmTarget(null);
    }
  }

  function handleRemoveClick(device: DeviceSession) {
    // Removing your own current device is just "log out" — no confirmation
    // needed. Removing a different device gets a confirm step since it
    // immediately signs someone else's active session out.
    if (device.isCurrentSession) {
      removeDevice(device);
    } else {
      setConfirmTarget(device);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#3A2A22]">Settings</h1>
        <p className="mt-1 text-sm text-[#8C7A70]">Manage your account and security preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#DE896A]" />
            Logged-in Devices
          </CardTitle>
          <CardDescription>
            Your account can be signed in on up to 2 devices at the same time. Remove a device to
            free up a slot for another one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#8C7A70]">
              <Loader2 className="h-4 w-4 animate-spin text-[#DE896A]" />
              <span>Loading devices...</span>
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-red-600">{error}</p>
          ) : devices.length === 0 ? (
            <p className="py-4 text-sm text-[#8C7A70]">No active devices found.</p>
          ) : (
            <ul className="space-y-3">
              {devices.map((device) => (
                <li
                  key={device.sessionId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#F5E2DA] p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FBECE7] text-[#DE896A]">
                      <Laptop className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#3A2A22]">
                          {device.deviceName || "Unknown device"}
                        </p>
                        {device.isCurrentSession && (
                          <Badge tone="green">This device</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#8C7A70]">
                        Last active {formatRelativeTime(device.lastActiveAt)} · Signed in{" "}
                        {formatRelativeTime(device.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removingId === device.sessionId}
                    onClick={() => handleRemoveClick(device)}
                  >
                    {removingId === device.sessionId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out this device?</DialogTitle>
            <DialogDescription>
              {confirmTarget?.deviceName || "This device"} will be signed out immediately and will
              need to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={!!removingId}
              onClick={() => confirmTarget && removeDevice(confirmTarget)}
            >
              {removingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Sign out device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
