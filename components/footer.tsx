import { Shield } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">SafeCheck</span>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Análise passiva de segurança. Não realizamos nenhuma ação invasiva no seu site.
          </p>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SafeCheck
          </p>
        </div>
      </div>
    </footer>
  )
}
