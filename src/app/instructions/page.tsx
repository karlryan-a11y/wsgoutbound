import { Card, CardContent } from "@/components/ui/card"

export default function InstructionsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Rules & Instructions</h1>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-lg text-muted-foreground">
            Manage always-apply rules for SQL filtering, tone, and vocabulary.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming in Phase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
