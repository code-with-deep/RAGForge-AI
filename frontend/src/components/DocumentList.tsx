"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, Trash2, Upload } from "lucide-react";
import { deleteDocument, documentChunks, ingestSamples, listDocuments, uploadDocument } from "@/lib/api";
import type { ChunkOut, DocumentOut } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";

export function DocumentList() {
  const documents = useAppStore((state) => state.documents);
  const setDocuments = useAppStore((state) => state.setDocuments);
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState("sample");
  const [chunks, setChunks] = useState<ChunkOut[]>([]);
  const [selected, setSelected] = useState<DocumentOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setDocuments(await listDocuments());
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await uploadDocument(file, tags);
      setFile(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function seed() {
    setLoading(true);
    setError(null);
    try {
      await ingestSamples();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sample ingestion failed");
    } finally {
      setLoading(false);
    }
  }

  async function inspect(document: DocumentOut) {
    setSelected(document);
    setChunks(await documentChunks(document.id));
  }

  async function remove(document: DocumentOut) {
    setLoading(true);
    setError(null);
    try {
      await deleteDocument(document.id);
      setSelected(null);
      setChunks([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader>
          <PanelTitle>Document Management</PanelTitle>
          <Button variant="outline" size="sm" onClick={seed} disabled={loading}>
            <Database className="h-4 w-4" />
            Samples
          </Button>
        </PanelHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>File</Label>
            <Input type="file" accept=".pdf,.txt,.docx,.md,.markdown" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1">
            <Label>Tags</Label>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </div>
          <Button onClick={upload} disabled={!file || loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
          {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </div>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>Documents</PanelTitle>
          <Badge tone="muted">{documents.length}</Badge>
        </PanelHeader>
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button className="text-left font-medium" onClick={() => inspect(document)}>
                  {document.filename}
                </button>
                <Button variant="ghost" size="icon" title="Delete document" onClick={() => remove(document)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="muted">{document.file_type}</Badge>
                <Badge tone="muted">{document.total_pages} pages</Badge>
                {Object.entries(document.chunk_counts).map(([strategy, count]) => (
                  <Badge key={strategy} tone="accent">
                    {strategy}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="lg:col-span-2">
        <PanelHeader>
          <PanelTitle>{selected ? selected.filename : "Chunks"}</PanelTitle>
          <Badge tone="muted">{chunks.length}</Badge>
        </PanelHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {chunks.slice(0, 80).map((chunk) => (
            <details key={chunk.id} className="rounded-md border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {chunk.strategy} / {chunk.section ?? "Unsectioned"}
              </summary>
              <p className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{chunk.text}</p>
            </details>
          ))}
        </div>
      </Panel>
    </div>
  );
}

