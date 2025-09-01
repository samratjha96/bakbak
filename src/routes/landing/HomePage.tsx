import {
  Mic,
  Play,
  Star,
  Users,
  MessageSquare,
  Languages,
  Zap,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { triggerSignIn } from "~/lib/auth-client";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">BakBak</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              How it Works
            </a>
            <a
              href="#testimonials"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Reviews
            </a>
            <Button
              onClick={() => triggerSignIn()}
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
            >
              Sign In
            </Button>
            <Button
              onClick={() => triggerSignIn()}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Get Started
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className="w-fit bg-blue-100 text-blue-700 border-blue-200"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Voice Message Learning
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-black text-balance leading-tight text-slate-900">
                  Learn from
                  <span className="text-blue-500 block">Voice Messages</span>
                </h1>
                <p className="text-xl text-slate-600 text-pretty leading-relaxed">
                  Transform voice messages from teachers, partners, and friends
                  into powerful language learning experiences. Record,
                  transcribe, and learn naturally with AI-powered insights.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => triggerSignIn()}
                  size="lg"
                  className="text-lg px-8 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
                <Button
                  onClick={() => triggerSignIn()}
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Play className="w-5 h-5 mr-2" />
                  See How It Works
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                  <span>4.9/5 rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>50k+ learners</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>1M+ recordings</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-50 to-slate-100 rounded-3xl p-8 flex items-center justify-center">
                <img
                  src="/lofi-girl-with-headphones-learning-languages-in-co.png"
                  alt="Person learning with voice messages"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <Languages className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      AI Translation
                    </p>
                    <p className="text-xs text-slate-500">
                      Instant understanding
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-balance text-slate-900">
              Perfect for Real Conversations
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto text-pretty">
              Whether it's your teacher's lesson, your partner's sweet message,
              or a friend's story—turn every voice message into a learning
              opportunity.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Teacher Voice Notes
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Perfect for language teachers leaving personalized audio
                  lessons. Students can replay, transcribe, and learn at their
                  own pace.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                  <Mic className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Partner Messages
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Learn your partner's native language through their voice
                  messages. Our AI helps you understand pronunciation, meaning,
                  and cultural context.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  AI-Powered Learning
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Advanced transcription, translation, and vocabulary
                  extraction. Learn words and phrases in context, the natural
                  way.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-balance text-slate-900">
              From Voice to Vocabulary
            </h2>
            <p className="text-xl text-slate-600 text-pretty">
              Three simple steps to turn any voice message into a learning
              experience
            </p>
          </div>
          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Record or Upload",
                description:
                  "Capture voice messages from teachers, partners, or friends. Upload existing audio files or record directly in the app.",
                icon: Mic,
              },
              {
                step: "02",
                title: "AI Transcription & Translation",
                description:
                  "Our AI instantly transcribes and translates the audio, highlighting key vocabulary and phrases you should learn.",
                icon: Languages,
              },
              {
                step: "03",
                title: "Practice & Learn",
                description:
                  "Review vocabulary cards, practice pronunciation, and track your progress as you master new words and phrases naturally.",
                icon: Star,
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-8 items-center">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <item.icon className="w-10 h-10 text-blue-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-slate-500">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-balance text-slate-900">
              Real Stories, Real Progress
            </h2>
            <p className="text-xl text-slate-600 text-pretty">
              See how BakBak is transforming language learning through voice
              messages
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Maria Santos",
                role: "Spanish Teacher",
                content:
                  "I send voice notes to my students daily. BakBak helps them understand every word and phrase. Their progress has been incredible!",
                rating: 5,
              },
              {
                name: "David Kim",
                role: "Learning Korean",
                content:
                  "My girlfriend sends me voice messages in Korean. BakBak breaks them down so I can understand and respond. It's like having a personal tutor.",
                rating: 5,
              },
              {
                name: "Sophie Chen",
                role: "Language Exchange Partner",
                content:
                  "Perfect for language exchange! I record messages for my partner, and they use BakBak to learn. Much more personal than textbooks.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="border border-slate-200 shadow-sm bg-white"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-blue-400 text-blue-400"
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-black text-balance text-slate-900">
                Ready to Turn Voice Messages into
                <span className="text-blue-500 block">Learning Gold?</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto text-pretty">
                Join thousands who are learning languages naturally through the
                voices of people they care about.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => triggerSignIn()}
                size="lg"
                className="text-lg px-8 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
              <Button
                onClick={() => triggerSignIn()}
                variant="outline"
                size="lg"
                className="text-lg px-8 bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Free 7-day trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900">BakBak</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Transform voice messages into powerful language learning
                experiences.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Product</h4>
              <div className="space-y-2 text-sm">
                <a
                  href="#features"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Languages
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Company</h4>
              <div className="space-y-2 text-sm">
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  About
                </a>
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Blog
                </a>
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Careers
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Support</h4>
              <div className="space-y-2 text-sm">
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Help Center
                </a>
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="#"
                  className="block text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Terms
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>© 2024 BakBak. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
