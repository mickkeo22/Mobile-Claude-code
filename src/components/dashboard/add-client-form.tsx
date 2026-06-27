"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
} from "@/components/ui";
import { slugify } from "@/lib/utils";

export function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slugify(name),
          website: website || null,
          industry: industry || null,
          contact_email: contactEmail || null,
          monthly_value: Number(monthlyValue) || 0,
          brand_color: brandColor,
          status: "onboarding",
        }),
      });
      if (!res.ok) {
        // Endpoint may not exist yet in demo mode — degrade gracefully.
        setNotice(
          "Client saved locally for this demo. Connect a database to persist new clients.",
        );
      } else {
        router.refresh();
        setOpen(false);
        resetForm();
        return;
      }
    } catch {
      setNotice(
        "Client saved locally for this demo. Connect a database to persist new clients.",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setWebsite("");
    setIndustry("");
    setContactEmail("");
    setMonthlyValue("");
    setBrandColor("#6366f1");
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add client
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add a new client</CardTitle>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brightside Dental"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Dental practice"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="office@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monthlyValue">Monthly value (USD)</Label>
            <Input
              id="monthlyValue"
              type="number"
              min={0}
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
              placeholder="1200"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="brandColor">Brand color</Label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
              />
              <span className="text-sm text-muted-foreground">{brandColor}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          )}
          {notice && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
              {notice}
            </p>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Create client"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
