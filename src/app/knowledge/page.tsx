import { Card, CardContent } from "@/components/ui/card"

export default function KnowledgePage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Knowledge Base</h1>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-lg text-muted-foreground">
            Upload brand docs, winning emails, and case studies here.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming in Phase 4.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
