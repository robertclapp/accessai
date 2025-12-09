/**
 * Home/Landing Page
 * 
 * Public landing page for AccessAI showcasing features and value proposition.
 * Fully accessible with WCAG 2.1 AA compliance.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  CheckCircle, 
  Sparkles, 
  Calendar, 
  BarChart3, 
  Users,
  Accessibility,
  Shield,
  ArrowRight,
  Play,
  Star
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const features = [
  { icon: Mic, title: "Voice-to-Text Creation", description: "Create content hands-free using our Whisper-powered voice recognition.", color: "bg-purple-500" },
  { icon: CheckCircle, title: "Accessibility Checker", description: "Real-time WCAG compliance feedback with AI-powered suggestions.", color: "bg-green-500" },
  { icon: Sparkles, title: "AI Content Generation", description: "Personalized AI that learns your writing style and brand voice.", color: "bg-blue-500" },
  { icon: Calendar, title: "Content Calendar", description: "Visual scheduling with drag-and-drop interface.", color: "bg-orange-500" },
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track post performance and accessibility scores.", color: "bg-pink-500" },
  { icon: Users, title: "Team Collaboration", description: "Work together with roles, permissions, and approval workflows.", color: "bg-indigo-500" }
];

const testimonials = [
  { quote: "AccessAI has transformed how I create content. The voice input feature means I can work even when my hands are tired.", author: "Sarah M.", role: "Content Creator with RSI", rating: 5 },
  { quote: "Finally, a tool that takes accessibility seriously. The WCAG checker has helped me reach a much wider audience.", author: "James K.", role: "Disability Advocate", rating: 5 },
  { quote: "The AI learns my style perfectly. It's like having a writing assistant who truly understands my brand.", author: "Maria L.", role: "Marketing Manager", rating: 5 }
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">Skip to main content</a>
      
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Accessibility className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AccessAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
            ) : (
              <><Button variant="ghost" asChild><a href={getLoginUrl()}>Sign In</a></Button><Button asChild><a href={getLoginUrl()}>Get Started Free</a></Button></>
            )}
          </div>
        </div>
      </nav>
      
      <main id="main-content">
        <section className="py-20 lg:py-32 bg-gradient-to-b from-background to-muted/30" aria-labelledby="hero-heading">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6"><Accessibility className="h-3 w-3 mr-1" />Accessibility-First Content Creation</Badge>
              <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Create Inclusive Content That <span className="text-primary">Everyone Can Access</span></h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">The AI-powered content creation platform built for accessibility. Voice input, WCAG compliance checking, and smart AI that learns your style.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild><a href={getLoginUrl()}>Start Creating Free<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                <Button size="lg" variant="outline" asChild><Link href="#features"><Play className="mr-2 h-4 w-4" />See How It Works</Link></Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">No credit card required • Free plan available forever</p>
            </div>
          </div>
        </section>
        
        <section className="py-12 border-y bg-muted/30" aria-label="Platform statistics">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div><div className="text-3xl font-bold text-primary">40M+</div><div className="text-sm text-muted-foreground">Americans with disabilities</div></div>
              <div><div className="text-3xl font-bold text-primary">97%</div><div className="text-sm text-muted-foreground">of websites are inaccessible</div></div>
              <div><div className="text-3xl font-bold text-primary">$13T</div><div className="text-sm text-muted-foreground">global spending power</div></div>
              <div><div className="text-3xl font-bold text-primary">100%</div><div className="text-sm text-muted-foreground">WCAG 2.1 AA compliant</div></div>
            </div>
          </div>
        </section>
        
        <section id="features" className="py-20" aria-labelledby="features-heading">
          <div className="container">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 id="features-heading" className="text-3xl font-bold mb-4">Everything You Need to Create Accessible Content</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">From voice input to AI-powered accessibility checking, we've built every feature with inclusivity in mind.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className={`p-3 rounded-lg ${feature.color} w-fit mb-4`}><Icon className="h-6 w-6 text-white" /></div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-gradient-to-r from-blue-500/10 to-purple-500/10" aria-labelledby="commitment-heading">
          <div className="container">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <Badge variant="outline" className="mb-4"><Shield className="h-3 w-3 mr-1" />Our Commitment</Badge>
                <h2 id="commitment-heading" className="text-3xl font-bold mb-4">Built by the Disability Community, for Everyone</h2>
                <p className="text-muted-foreground mb-6">AccessAI was created by professionals with 20+ years of experience in disability services.</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Full keyboard navigation</span></li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Screen reader optimized</span></li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Voice-first workflows</span></li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>High contrast mode support</span></li>
                </ul>
              </div>
              <div className="flex-1">
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Accessibility className="h-12 w-12 text-primary" />
                    <div><div className="font-bold text-2xl">WCAG 2.1 AA</div><div className="text-muted-foreground">Certified Compliant</div></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Our platform meets the highest accessibility standards.</p>
                </Card>
              </div>
            </div>
          </div>
        </section>
        
        <section id="testimonials" className="py-20" aria-labelledby="testimonials-heading">
          <div className="container">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Testimonials</Badge>
              <h2 id="testimonials-heading" className="text-3xl font-bold mb-4">Loved by Content Creators</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="h-full">
                  <CardContent className="pt-6 flex flex-col h-full">
                    <div className="flex gap-1 mb-4">{Array.from({ length: testimonial.rating }).map((_, i) => (<Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />))}</div>
                    <blockquote className="flex-1 text-muted-foreground mb-4">"{testimonial.quote}"</blockquote>
                    <div><div className="font-semibold">{testimonial.author}</div><div className="text-sm text-muted-foreground">{testimonial.role}</div></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-primary text-primary-foreground" aria-labelledby="cta-heading">
          <div className="container text-center">
            <h2 id="cta-heading" className="text-3xl font-bold mb-4">Ready to Create Accessible Content?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">Join thousands of content creators who are making the internet more inclusive.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild><a href={getLoginUrl()}>Get Started Free<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild><Link href="/pricing">View Pricing</Link></Button>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-12 border-t" role="contentinfo">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div><Link href="/" className="flex items-center gap-2 mb-4"><Accessibility className="h-6 w-6 text-primary" /><span className="font-bold">AccessAI</span></Link><p className="text-sm text-muted-foreground">Making content creation accessible to everyone.</p></div>
            <div><h3 className="font-semibold mb-4">Product</h3><ul className="space-y-2 text-sm text-muted-foreground"><li><Link href="/pricing">Pricing</Link></li><li><Link href="#features">Features</Link></li><li><Link href="/dashboard">Dashboard</Link></li></ul></div>
            <div><h3 className="font-semibold mb-4">Resources</h3><ul className="space-y-2 text-sm text-muted-foreground"><li><Link href="/knowledge">Knowledge Base</Link></li><li><Link href="/contact">Contact Support</Link></li></ul></div>
            <div><h3 className="font-semibold mb-4">Legal</h3><ul className="space-y-2 text-sm text-muted-foreground"><li><Link href="/privacy">Privacy Policy</Link></li><li><Link href="/terms">Terms of Service</Link></li></ul></div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground"><p>© {new Date().getFullYear()} AccessAI. All rights reserved.</p><p className="mt-2">Built with ❤️ for the disability community</p></div>
        </div>
      </footer>
    </div>
  );
}
