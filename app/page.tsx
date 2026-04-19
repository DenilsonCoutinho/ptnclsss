import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ScanForm } from "@/components/scan-form"
import { Shield, Zap, Lock, Eye, CheckCircle } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Análise Instantânea",
    description: "Resultados em segundos, sem configuração complexa.",
  },
  {
    icon: Lock,
    title: "100% Passivo",
    description: "Não realizamos nenhuma ação que possa afetar seu site.",
  },
  {
    icon: Eye,
    title: "Visão Completa",
    description: "Headers, SSL, cookies, DNS e muito mais em um só lugar.",
  },
]

const checks = [
  "Headers de Segurança (HSTS, CSP, X-Frame-Options)",
  "Certificado SSL/TLS e configuração",
  "Cookies e flags de segurança",
  "Conteúdo misto e vulnerabilidades",
  "Configurações de DNS e domínio",
  "Exposição de informações sensíveis",
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          
          <div className="container mx-auto px-4 py-16 md:py-24 relative">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Shield className="h-4 w-4" />
                Análise de Segurança Gratuita
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
                Descubra vulnerabilidades no seu site{" "}
                <span className="text-primary">em segundos</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground text-pretty">
                Análise passiva de segurança que verifica headers, SSL, cookies e muito mais.
                Sem cadastro, sem custo, sem risco.
              </p>
            </div>

            <ScanForm />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              Por que usar o SafeCheck?
            </h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="text-center p-6 rounded-xl bg-background border border-border"
                >
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checks Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  O que verificamos
                </h2>
                <p className="text-muted-foreground">
                  Análise abrangente de diversos aspectos de segurança do seu site.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {checks.map((check) => (
                  <div
                    key={check}
                    className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-foreground">{check}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Pronto para verificar seu site?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Comece agora mesmo. É gratuito, rápido e não requer cadastro.
            </p>
            <a
              href="#top"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Shield className="h-5 w-5" />
              Analisar Agora
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
