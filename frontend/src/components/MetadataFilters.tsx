"use client";

import type { DocumentOut, MetadataFilters as Filters } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const chunkStrategies = ["recursive", "semantic", "section", "parent_child"];

function split(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MetadataFilters({
  value,
  documents,
  onChange
}: {
  value: Filters;
  documents: DocumentOut[];
  onChange: (filters: Filters) => void;
}) {
  return (
    <details className="rounded-md border border-border bg-muted/40 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Metadata filters</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Source</Label>
          <Select
            value={value.sources[0] ?? ""}
            onChange={(event) => onChange({ ...value, sources: event.target.value ? [event.target.value] : [] })}
          >
            <option value="">All sources</option>
            {documents.map((document) => (
              <option key={document.id} value={document.filename}>
                {document.filename}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Page start</Label>
          <Input
            type="number"
            min={1}
            value={value.page_start ?? ""}
            onChange={(event) =>
              onChange({ ...value, page_start: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Page end</Label>
          <Input
            type="number"
            min={1}
            value={value.page_end ?? ""}
            onChange={(event) =>
              onChange({ ...value, page_end: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Sections</Label>
          <Input
            value={value.sections.join(", ")}
            onChange={(event) => onChange({ ...value, sections: split(event.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>Tags</Label>
          <Input value={value.tags.join(", ")} onChange={(event) => onChange({ ...value, tags: split(event.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Chunk strategy</Label>
          <Select
            value={value.chunk_strategies[0] ?? ""}
            onChange={(event) =>
              onChange({ ...value, chunk_strategies: event.target.value ? [event.target.value] : [] })
            }
          >
            <option value="">All searchable chunks</option>
            {chunkStrategies.map((strategy) => (
              <option key={strategy} value={strategy}>
                {strategy}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date start</Label>
          <Input
            type="date"
            value={value.date_start ?? ""}
            onChange={(event) =>
              onChange({ ...value, date_start: event.target.value || null })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Date end</Label>
          <Input
            type="date"
            value={value.date_end ?? ""}
            onChange={(event) =>
              onChange({ ...value, date_end: event.target.value || null })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Logic</Label>
          <Select value={value.logic} onChange={(event) => onChange({ ...value, logic: event.target.value as "and" | "or" })}>
            <option value="and">AND</option>
            <option value="or">OR</option>
          </Select>
        </div>
      </div>
    </details>
  );
}

