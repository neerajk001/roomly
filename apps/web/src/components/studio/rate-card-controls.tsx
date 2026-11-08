"use client";
import { useActionState } from "react";
import {
  createRateCardAction,
  setDefaultRateCardAction,
  type RateCardState,
} from "@/server/actions/rate-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RateCardControls({
  cards,
}: {
  cards: { id: string; name: string; isDefault: boolean }[];
}) {
  const [createState, createAction, creating] = useActionState(
    createRateCardAction,
    {} as RateCardState,
  );
  const [defaultState, defaultAction, saving] = useActionState(
    setDefaultRateCardAction,
    {} as RateCardState,
  );
  return (
    <div className="grid gap-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
      <form action={createAction} className="space-y-3">
        <Label htmlFor="new-rate-card-name">New rate card</Label>
        <Input
          id="new-rate-card-name"
          name="name"
          placeholder="Standard or Premium"
          required
          maxLength={120}
        />
        <Button type="submit" disabled={creating}>
          {creating ? "Creating…" : "Create rate card"}
        </Button>
        {createState.error && (
          <p role="alert" className="text-sm text-destructive">
            {createState.error}
          </p>
        )}
        {createState.notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {createState.notice}
          </p>
        )}
      </form>
      <form action={defaultAction} className="space-y-3">
        <Label htmlFor="default-rate-card">Default rate card</Label>
        <select
          id="default-rate-card"
          name="rateCardId"
          defaultValue={cards.find((card) => card.isDefault)?.id}
          className="h-11 w-full rounded-lg border border-input bg-card px-3"
        >
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={saving || cards.length === 0}>
          {saving ? "Saving…" : "Set default"}
        </Button>
        {defaultState.error && (
          <p role="alert" className="text-sm text-destructive">
            {defaultState.error}
          </p>
        )}
        {defaultState.notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {defaultState.notice}
          </p>
        )}
      </form>
    </div>
  );
}
