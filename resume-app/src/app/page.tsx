import Link from "next/link";
import {
  ArrowRight,
  Scan,
  FileText,
  Send,
  BarChart3,
  Zap,
  Shield,
  Bot,
  CheckCircle,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 backdrop-blur-sm sticky top-0 z-50 bg-gray-950/90">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Bot size={17} className="text-white" />
            </div>
            <span className="text-base font-bold text-white">AI Job Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
          <Zap size={12} />
          AI-powered job application automation
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
          Land your dream job
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            10x faster with AI
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Scan any job posting, get a tailored resume in seconds, auto-apply, and track every application
          — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base"
          >
            Start for free
            <ArrowRight size={17} />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-7 py-3.5 rounded-xl transition-colors text-base"
          >
            See how it works
          </Link>
        </div>

        {/* Social proof badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              {["bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-blue-500"].map((c, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-gray-950`} />
              ))}
            </div>
            <span>2,000+ job seekers</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
            ))}
            <span className="ml-1">4.9 / 5</span>
          </div>
          <span>No credit card required</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-900/40 border-y border-gray-800/60 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-gray-400">Three steps from job posting to application sent</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-indigo-600/40 via-purple-600/40 to-indigo-600/40" />

            {[
              {
                step: "01",
                icon: Scan,
                color: "text-indigo-400",
                bg: "bg-indigo-950/60",
                border: "border-indigo-800/40",
                title: "Scan the job posting",
                desc: "Paste any job URL or description. Our AI extracts requirements, keywords, and scores your resume match instantly.",
              },
              {
                step: "02",
                icon: FileText,
                color: "text-purple-400",
                bg: "bg-purple-950/60",
                border: "border-purple-800/40",
                title: "Get a tailored resume",
                desc: "AI rewrites your resume section-by-section to highlight relevant experience — without fabricating anything.",
              },
              {
                step: "03",
                icon: Send,
                color: "text-pink-400",
                bg: "bg-pink-950/60",
                border: "border-pink-800/40",
                title: "Auto-apply & track",
                desc: "Apply with one click and watch every application move through your Kanban pipeline in real time.",
              },
            ].map(({ step, icon: Icon, color, bg, border, title, desc }) => (
              <div
                key={step}
                className={`relative rounded-2xl border ${border} ${bg} p-7 flex flex-col gap-4`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                    <Icon size={19} className={color} />
                  </div>
                  <span className={`text-xs font-bold tracking-widest ${color} opacity-60`}>STEP {step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything you need to get hired</h2>
          <p className="text-gray-400">Built for modern job seekers who move fast</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Zap,
              color: "text-yellow-400",
              bg: "bg-yellow-950/40",
              title: "ATS Score Analysis",
              desc: "Instant keyword match scoring so you know exactly how your resume stacks up before you apply.",
            },
            {
              icon: FileText,
              color: "text-indigo-400",
              bg: "bg-indigo-950/40",
              title: "AI Resume Tailoring",
              desc: "Section-by-section rewriting preserves your voice while maximizing relevance for each role.",
            },
            {
              icon: Send,
              color: "text-purple-400",
              bg: "bg-purple-950/40",
              title: "One-click Apply",
              desc: "Apply directly from the app. Tailored resume and cover letter auto-generated and ready to send.",
            },
            {
              icon: BarChart3,
              color: "text-green-400",
              bg: "bg-green-950/40",
              title: "Kanban Pipeline",
              desc: "Track every application from saved → offer in a drag-and-drop board with full status history.",
            },
            {
              icon: Shield,
              color: "text-blue-400",
              bg: "bg-blue-950/40",
              title: "Cover Letter AI",
              desc: "Professional cover letters generated alongside your tailored resume — no templates, no placeholders.",
            },
            {
              icon: Bot,
              color: "text-pink-400",
              bg: "bg-pink-950/40",
              title: "Email Monitor",
              desc: "Automatically classify recruiter emails as interviews, rejections, or follow-ups the moment they arrive.",
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
            >
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={19} className={color} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-gray-900/40 border-y border-gray-800/60 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Loved by job seekers</h2>
            <p className="text-gray-400">Real results from real people</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "I got 3x more callbacks after using the ATS scorer. It told me exactly what keywords I was missing.",
                name: "Sarah K.",
                title: "Software Engineer",
              },
              {
                quote: "The section-by-section tailoring is incredible. My resume actually sounds like me, not a robot.",
                name: "Marcus T.",
                title: "Product Manager",
              },
              {
                quote: "Went from 0 to offer in 6 weeks. The Kanban board kept me sane during the whole process.",
                name: "Priya M.",
                title: "Data Scientist",
              },
            ].map(({ quote, name, title }) => (
              <div
                key={name}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-xs text-gray-500">{title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 max-w-6xl mx-auto px-6 text-center">
        <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-800/40 rounded-3xl px-8 py-16">
          <h2 className="text-4xl font-extrabold mb-4">
            Ready to automate your job search?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of job seekers using AI to apply smarter and land faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
            >
              Get started — it&apos;s free
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-gray-500">
            {["No credit card required", "Set up in under 2 minutes", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-green-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Bot size={13} className="text-white" />
            </div>
            <span>AI Job Agent</span>
          </div>
          <p>Built with AI to help you get hired faster.</p>
        </div>
      </footer>
    </div>
  );
}
