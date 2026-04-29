import { DocumentList } from "@/components/DocumentList";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Document Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload, manage, and inspect your document corpus</p>
      </div>
      <DocumentList />
    </div>
  );
}
