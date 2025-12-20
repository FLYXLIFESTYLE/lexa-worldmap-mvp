# ONE DAY MVP - COMPLETE CODE TEMPLATES

Copy-paste these directly tomorrow morning! 🚀

---

## 🎨 Global Styles (`styles/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 45 93% 47%;
    --secondary-foreground: 0 0% 0%;
    --accent: 338 81% 70%;
  }
  
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 📄 Root Layout (`app/layout.tsx`)

```typescript
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Badge } from '@/components/ui/badge'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'LEXA - Luxury Experience AI',
  description: 'Personalized luxury travel experiences crafted by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <div className="fixed top-4 right-4 z-50">
          <Badge variant="secondary" className="bg-yellow-500 text-black font-bold">
            BETA
          </Badge>
        </div>
        {children}
      </body>
    </html>
  )
}
```

---

## 🏠 Landing Page (`app/page.tsx`)

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <h1 className="text-6xl md:text-8xl font-serif text-center mb-6">
        LEXA
      </h1>
      
      <p className="text-xl md:text-2xl text-center mb-4 max-w-3xl text-slate-300">
        Your desires. AIlessia's intelligence.
      </p>
      <p className="text-xl md:text-2xl text-center mb-12 max-w-3xl">
        Unforgettable experiences.
      </p>
      
      <Link href="/onboarding">
        <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-6">
          Begin Your Journey
        </Button>
      </Link>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="text-center">
          <div className="text-4xl mb-3">❤️</div>
          <h3 className="font-semibold mb-2">Share Your Vision</h3>
          <p className="text-sm text-slate-400">Tell AIlessia what moves you</p>
        </div>
        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="font-semibold mb-2">AIlessia Crafts</h3>
          <p className="text-sm text-slate-400">Personalized to your soul</p>
        </div>
        <div className="text-center">
          <div className="text-4xl mb-3">⛵</div>
          <h3 className="font-semibold mb-2">Experience Awaits</h3>
          <p className="text-sm text-slate-400">Your perfect journey</p>
        </div>
      </div>
    </div>
  )
}
```

---

## 👤 Onboarding (`app/onboarding/page.tsx`)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OnboardingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ email: '', name: '' })
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('http://localhost:8000/api/ailessia/account/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      // Store in localStorage
      localStorage.setItem('lexa_account_id', data.account_id)
      localStorage.setItem('lexa_session_id', data.session_id)
      localStorage.setItem('lexa_name', formData.name || 'Guest')
      
      router.push('/experience')
    } catch (error) {
      alert('Error creating account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="max-w-lg w-full p-8">
        <h2 className="text-4xl font-serif mb-2">Welcome to LEXA</h2>
        <p className="text-slate-600 mb-6">Let's begin your journey</p>
        
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm">
            <strong>Why create an account?</strong><br/>
            We highly individualize every conversation and experience script. Your emotional 
            profile creates unique recommendations tailored specifically to you.
            <br/><br/>
            <strong>For Charter Brokers & Travel Agents:</strong><br/>
            Create accounts WITH your clients (not for them!) to ensure their profiles stay 
            pure and authentic. You'll earn lifetime commissions on ALL their bookings—even 
            future ones! First come, first serve: once a client is assigned to you, they're 
            yours for life. 🎯
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
              className="h-12"
            />
          </div>
          <div>
            <Input
              placeholder="Your name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="h-12"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 text-lg" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

---

## 🎯 3-Step Builder (`app/experience/page.tsx`)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Check } from 'lucide-react'

const DESTINATIONS = [
  { name: 'French Riviera', description: '247 luxury experiences', emoji: '🇫🇷' },
  { name: 'Amalfi Coast', description: '87 Mediterranean gems', emoji: '🇮🇹' },
  { name: 'Greek Islands', description: '156 Aegean experiences', emoji: '🇬🇷' },
  { name: 'Caribbean', description: '203 island adventures', emoji: '🏝️' }
]

const THEMES = [
  { name: 'Romantic Escape', icon: '🌅', description: 'Intimate moments together' },
  { name: 'Gastronomic Journey', icon: '🍷', description: 'Culinary excellence' },
  { name: 'Adventure & Freedom', icon: '⛵', description: 'Thrill and exploration' },
  { name: 'Cultural Immersion', icon: '🎭', description: 'Art, history, heritage' },
  { name: 'Wellness & Renewal', icon: '🧘', description: 'Mind, body, spirit' },
  { name: 'Prestige & Luxury', icon: '🏆', description: 'Exclusive experiences' }
]

export default function ExperienceBuilder() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'selections'>('intro')
  const [selections, setSelections] = useState({
    destination: '',
    theme: '',
    time: null as Date | null
  })
  
  const canContinue = selections.destination || selections.theme || selections.time
  
  const handleContinue = () => {
    localStorage.setItem('lexa_selections', JSON.stringify(selections))
    router.push('/experience/chat')
  }
  
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-2xl w-full p-8 text-center">
          <h1 className="text-4xl font-serif mb-4">
            Hello {localStorage.getItem('lexa_name')}!
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            I'm AIlessia. Let's create something extraordinary together.
            <br/>
            Share what you know—I'll help with the rest.
          </p>
          <Button 
            onClick={() => setStep('selections')}
            size="lg"
            className="text-lg px-8"
          >
            Let's Begin
          </Button>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-serif mb-2">Three simple questions</h1>
        <p className="text-slate-600 mb-8">
          Choose at least one. AIlessia will recommend the perfect matches for the others.
        </p>
        
        {/* Destinations */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📍</span>
            Where would you like to go?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DESTINATIONS.map(dest => (
              <Card
                key={dest.name}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selections.destination === dest.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelections({...selections, destination: dest.name})}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl mb-2">{dest.emoji}</p>
                    <p className="font-semibold text-lg">{dest.name}</p>
                    <p className="text-sm text-slate-600">{dest.description}</p>
                  </div>
                  {selections.destination === dest.name && (
                    <Check className="w-6 h-6 text-blue-500" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Themes */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">✨</span>
            What draws you?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {THEMES.map(theme => (
              <Card
                key={theme.name}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selections.theme === theme.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelections({...selections, theme: theme.name})}
              >
                <div className="text-center">
                  <p className="text-3xl mb-2">{theme.icon}</p>
                  <p className="font-semibold text-sm mb-1">{theme.name}</p>
                  <p className="text-xs text-slate-600">{theme.description}</p>
                  {selections.theme === theme.name && (
                    <Check className="w-5 h-5 text-blue-500 mx-auto mt-2" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Time */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            When are you planning?
          </h3>
          <Card className="p-4 inline-block">
            <Calendar
              mode="single"
              selected={selections.time || undefined}
              onSelect={(date) => setSelections({...selections, time: date || null})}
              className="rounded-md"
            />
          </Card>
        </div>
        
        <div className="sticky bottom-6 bg-white rounded-lg shadow-lg p-4">
          <Button 
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {canContinue ? 'Continue with AIlessia' : 'Select at least one option'}
          </Button>
          {canContinue && (
            <p className="text-sm text-center text-slate-600 mt-2">
              AIlessia will help perfect the details ✨
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 💬 Chat Interface (`app/experience/chat/page.tsx`)

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'ailessia'
  content: string
  quickActions?: string[]
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationStage, setConversationStage] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Initial AIlessia greeting
    const selections = JSON.parse(localStorage.getItem('lexa_selections') || '{}')
    const name = localStorage.getItem('lexa_name')
    
    let greeting = `Hello ${name}! `
    
    if (selections.destination) {
      greeting += `${selections.destination} - wonderful choice. `
    }
    if (selections.theme) {
      greeting += `I can feel your desire for ${selections.theme}. `
    }
    
    greeting += `Tell me, what brings you to create this experience? What are you celebrating or seeking?`
    
    sendAillessiaMessage(greeting, [
      "It's our anniversary",
      "Celebrating an achievement",
      "I need to reconnect with myself"
    ])
  }, [])
  
  const sendAillessiaMessage = (content: string, quickActions?: string[]) => {
    setMessages(prev => [...prev, { role: 'ailessia', content, quickActions }])
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const sendMessage = async (content: string) => {
    if (!content.trim()) return
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content }])
    setInput('')
    setIsTyping(true)
    
    try {
      const accountId = localStorage.getItem('lexa_account_id')
      const sessionId = localStorage.getItem('lexa_session_id')
      
      const response = await fetch('http://localhost:8000/api/ailessia/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          session_id: sessionId,
          message: content,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })
      
      const data = await response.json()
      setIsTyping(false)
      
      // Progress conversation stage
      setConversationStage(prev => prev + 1)
      
      // Generate smart quick actions based on stage
      const quickActions = getQuickActions(conversationStage, data)
      
      sendAillessiaMessage(data.ailessia_response, quickActions)
      
      // After enough conversation, offer script generation
      if (conversationStage >= 6) {
        setTimeout(() => {
          sendAillessiaMessage(
            "I have everything I need. Shall I craft your Experience Script?",
            ["Yes, show me!", "A few more questions", "Let me think"]
          )
        }, 2000)
      }
      
    } catch (error) {
      setIsTyping(false)
      sendAillessiaMessage("I apologize, I'm having trouble connecting. Please try again.")
    }
  }
  
  const getQuickActions = (stage: number, data: any): string[] => {
    // Smart quick actions based on conversation context
    if (stage <= 2) {
      // Early stage: emotional discovery
      return [
        "Tell me more",
        "That resonates",
        "Actually, it's more..."
      ]
    } else if (stage <= 5) {
      // Mid stage: preferences
      return [
        "Sounds perfect",
        "Show me options",
        "I prefer..."
      ]
    } else {
      // Late stage: finalization
      return [
        "Yes, perfect",
        "One more thing",
        "Show me the script"
      ]
    }
  }
  
  const handleGenerateScript = () => {
    router.push('/preview')
  }
  
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">AIlessia</h2>
            <p className="text-xs text-slate-600">Creating your experience...</p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border'
              } rounded-2xl p-4 shadow-sm`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {msg.quickActions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.quickActions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage(action)}
                        className="text-xs"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-2xl p-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Share your thoughts..."
            className="flex-1 min-h-[60px] max-h-[120px]"
          />
          <Button 
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            size="lg"
            className="px-6"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-center text-slate-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
```

---

## 📜 Script Preview (`app/preview/page.tsx`)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Share2 } from 'lucide-react'

export default function PreviewPage() {
  const [script, setScript] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    generateScript()
  }, [])
  
  const generateScript = async () => {
    try {
      const accountId = localStorage.getItem('lexa_account_id')
      const sessionId = localStorage.getItem('lexa_session_id')
      const selections = JSON.parse(localStorage.getItem('lexa_selections') || '{}')
      
      const response = await fetch('http://localhost:8000/api/ailessia/compose-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          session_id: sessionId,
          selected_choices: selections
        })
      })
      
      const data = await response.json()
      setScript(data)
    } catch (error) {
      console.error('Error generating script:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const downloadPDF = async () => {
    // TODO: Implement PDF download
    alert('PDF download will be implemented!')
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-lg">AIlessia is crafting your experience...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <Card className="p-8 mb-6 bg-gradient-to-br from-purple-900 to-blue-900 text-white">
          <h1 className="text-4xl md:text-5xl font-serif mb-4">
            {script?.title || 'Your Experience'}
          </h1>
          <p className="text-lg opacity-90">
            Crafted by AIlessia for {localStorage.getItem('lexa_name')}
          </p>
        </Card>
        
        {/* Cinematic Hook */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl font-serif mb-4">The Vision</h2>
          <p className="text-lg leading-relaxed text-slate-700 italic">
            {script?.cinematic_hook || 'Your personalized experience awaits...'}
          </p>
        </Card>
        
        {/* Emotional Arc */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl font-serif mb-4">Your Journey</h2>
          <p className="text-slate-700 leading-relaxed">
            {script?.emotional_arc || 'A journey designed for your soul...'}
          </p>
        </Card>
        
        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <Button onClick={downloadPDF} size="lg" className="flex-1">
            <Download className="w-5 h-5 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="lg" className="flex-1">
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
        
        {/* AIlessia Message */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <p className="text-center italic">
            "{script?.ailessia_message || 'Your experience is ready. I can\'t wait for you to live it.'}"
            <br/>
            <span className="text-sm text-slate-600">— AIlessia</span>
          </p>
        </Card>
      </div>
    </div>
  )
}
```

---

## ✅ THAT'S IT!

Copy these files tomorrow morning and you'll have a working MVP! 🎉

