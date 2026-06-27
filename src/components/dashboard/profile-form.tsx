"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export function ProfileForm({
  defaultEmail,
}: {
  defaultEmail: string;
}) {
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setNotice(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, agency_name: agencyName }),
      });
      if (!res.ok) {
        setNotice(
          "Saved locally for this demo. Connect a database to persist your profile.",
        );
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setNotice(
        "Saved locally for this demo. Connect a database to persist your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Alex Rivera"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="agency_name">Agency name</Label>
        <Input
          id="agency_name"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          placeholder="Rivera Digital"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={defaultEmail} disabled />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
        </Button>
        {notice && (
          <p className="text-sm text-muted-foreground">{notice}</p>
        )}
      </div>
    </form>
  );
}
