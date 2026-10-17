import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toLocalInput } from "@/lib/format";
import type { EventSummary } from "@/lib/types";
import { Button, ErrorState, Field, FormError, Input, PageHeader, Select, Spinner, Textarea, Tile, TileHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";

const ACCENTS = ["#7058F5", "#4285FF", "#FF7890", "#FFC857", "#3DCFAE"];

const day = (n: number, h: number) => {
  const d = new Date(Date.now() + n * 864e5);
  d.setHours(h, 0, 0, 0);
  return toLocalInput(d);
};

const EMPTY = {
  title: "",
  tagline: "",
  description: "",
  category: "",
  mode: "ONLINE",
  location: "",
  registrationClosesAt: day(14, 23),
  startsAt: day(21, 9),
  submissionDeadline: day(22, 18),
  endsAt: day(22, 20),
  minTeamSize: "2",
  maxTeamSize: "4",
  maxTeams: "",
  eligibility: "",
  rules: "",
  prizes: "",
  accentColor: "#7058F5",
};
type FormState = typeof EMPTY;

export default function EventForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);

  const existing = useQuery({
    queryKey: ["event", id],
    queryFn: () => api<{ event: EventSummary }>(`/events/${id}`),
    enabled: editing,
  });

  useEffect(() => {
    const e = existing.data?.event;
    if (!e) return;
    setForm({
      title: e.title,
      tagline: e.tagline,
      description: e.description,
      category: e.category,
      mode: e.mode,
      location: e.location ?? "",
      registrationClosesAt: toLocalInput(e.registrationClosesAt),
      startsAt: toLocalInput(e.startsAt),
      submissionDeadline: toLocalInput(e.submissionDeadline),
      endsAt: toLocalInput(e.endsAt),
      minTeamSize: String(e.minTeamSize),
      maxTeamSize: String(e.maxTeamSize),
      maxTeams: e.maxTeams ? String(e.maxTeams) : "",
      eligibility: e.eligibility ?? "",
      rules: e.rules ?? "",
      prizes: e.prizes ?? "",
      accentColor: e.accentColor,
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        location: form.location || null,
        maxTeams: form.maxTeams ? Number(form.maxTeams) : null,
        eligibility: form.eligibility || null,
        rules: form.rules || null,
        prizes: form.prizes || null,
        minTeamSize: Number(form.minTeamSize),
        maxTeamSize: Number(form.maxTeamSize),
        registrationClosesAt: new Date(form.registrationClosesAt).toISOString(),
        startsAt: new Date(form.startsAt).toISOString(),
        submissionDeadline: new Date(form.submissionDeadline).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      return editing ? api<{ event: EventSummary }>(`/events/${id}`, { method: "PATCH", body }) : api<{ event: EventSummary }>("/events", { body });
    },
    onSuccess: ({ event }) => {
      qc.invalidateQueries();
      toast({ title: editing ? "Changes saved" : "Draft created", body: editing ? undefined : "Add problem statements, then open registration.", tone: "success" });
      navigate(`/app/organize/${event.id}`);
    },
    onError: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  });

  if (editing && existing.isLoading) return <Spinner />;
  if (editing && existing.isError) return <ErrorState error={existing.error} />;

  const err = save.error instanceof ApiError ? save.error : null;
  const fe = err?.fields ?? {};
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <>
      <PageHeader title={editing ? "Edit hackathon" : "Host a hackathon"} description={editing ? undefined : "This creates a private draft. Nobody sees it until you publish it from the command center."} />
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_20rem]" noValidate>
        <div className="space-y-4">
          {err && <FormError message={err.message} />}
          <Tile>
            <TileHeader title="The basics" />
            <div className="grid gap-4">
              <Field label="Title" error={fe.title}>
                <Input value={form.title} onChange={set("title")} required maxLength={100} />
              </Field>
              <Field label="Tagline" hint="One sentence shown on cards and the event header." error={fe.tagline}>
                <Input value={form.tagline} onChange={set("tagline")} required maxLength={160} />
              </Field>
              <Field label="Description" error={fe.description}>
                <Textarea value={form.description} onChange={set("description")} required className="min-h-36" />
              </Field>
              <Field label="Category" hint="For example Climate, Fintech or Open innovation." error={fe.category}>
                <Input value={form.category} onChange={set("category")} required maxLength={40} />
              </Field>
            </div>
          </Tile>

          <Tile>
            <TileHeader title="Format and schedule" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Format" error={fe.mode}>
                <Select value={form.mode} onChange={set("mode")}>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">In person</option>
                  <option value="HYBRID">Hybrid</option>
                </Select>
              </Field>
              <Field label="Venue" optional={form.mode === "ONLINE"} error={fe.location}>
                <Input value={form.location} onChange={set("location")} />
              </Field>
              <Field label="Registration closes" error={fe.registrationClosesAt}>
                <Input type="datetime-local" value={form.registrationClosesAt} onChange={set("registrationClosesAt")} required />
              </Field>
              <Field label="Hackathon starts" error={fe.startsAt}>
                <Input type="datetime-local" value={form.startsAt} onChange={set("startsAt")} required />
              </Field>
              <Field label="Submission deadline" error={fe.submissionDeadline}>
                <Input type="datetime-local" value={form.submissionDeadline} onChange={set("submissionDeadline")} required />
              </Field>
              <Field label="Hackathon ends" error={fe.endsAt}>
                <Input type="datetime-local" value={form.endsAt} onChange={set("endsAt")} required />
              </Field>
            </div>
          </Tile>

          <Tile>
            <TileHeader title="Teams" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Minimum size" error={fe.minTeamSize}>
                <Input type="number" min={1} max={10} value={form.minTeamSize} onChange={set("minTeamSize")} required />
              </Field>
              <Field label="Maximum size" error={fe.maxTeamSize}>
                <Input type="number" min={1} max={10} value={form.maxTeamSize} onChange={set("maxTeamSize")} required />
              </Field>
              <Field label="Team slots" optional hint="Leave empty for no limit." error={fe.maxTeams}>
                <Input type="number" min={1} value={form.maxTeams} onChange={set("maxTeams")} />
              </Field>
            </div>
          </Tile>

          <Tile>
            <TileHeader title="Rules, eligibility and prizes" />
            <div className="grid gap-4">
              <Field label="Eligibility" optional error={fe.eligibility}>
                <Textarea value={form.eligibility} onChange={set("eligibility")} className="min-h-20" />
              </Field>
              <Field label="Rules" optional hint="One rule per line." error={fe.rules}>
                <Textarea value={form.rules} onChange={set("rules")} />
              </Field>
              <Field label="Prizes" optional hint="One prize per line." error={fe.prizes}>
                <Textarea value={form.prizes} onChange={set("prizes")} className="min-h-20" />
              </Field>
            </div>
          </Tile>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Tile>
            <TileHeader title="Accent colour" />
            <div className="flex gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, accentColor: c }))}
                  className={cn("clay grid size-10 place-items-center rounded-xl text-navy", form.accentColor === c && "ring-4 ring-violet/30")}
                  style={{ ["--clay" as string]: c }}
                  aria-label={`Accent ${c}`}
                  aria-pressed={form.accentColor === c}
                >
                  {form.accentColor === c && <Check className="size-4" aria-hidden />}
                </button>
              ))}
            </div>
            <div className="clay mt-5 rounded-2xl p-4 text-navy" style={{ ["--clay" as string]: form.accentColor }}>
              <p className="font-display text-lg font-bold">{form.title || "Your hackathon"}</p>
              <p className="text-sm text-navy/75">{form.tagline || "Tagline preview"}</p>
            </div>
          </Tile>
          <Button type="submit" size="lg" className="w-full" loading={save.isPending}>
            {editing ? "Save changes" : "Create draft"}
          </Button>
          {!editing && <p className="text-center text-sm text-ink-soft">Five standard judging criteria are added for you. You can edit them before judging starts.</p>}
        </aside>
      </form>
    </>
  );
}
