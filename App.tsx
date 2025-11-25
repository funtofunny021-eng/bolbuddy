import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, Gender, LanguageGoal, UserProfile } from './types';
import { GlassCard, Button3D, GlowingInput } from './components/GlassUI';
import { TopBar, DailyGoalRing, IslandNode } from './components/DashboardComponents';
import { BottomNav, Mascot, MascotState } from './components/Layout.tsx';
import { ParentDashboard } from './components/ParentDashboard';
import { ArrowRight, Globe, Mic, RefreshCw, CheckCircle } from 'lucide-react';
import { chatWithChhutku, playChhutkuVoice, ChatResponse, ensureAudioContextReady } from './geminiService';

const ISLANDS_DATA = [
  { id: 1, title: 'Greetings', description: 'Say Hello!', color: 'green', icon: '👋', unlocked: true, totalLevels: 5, completedLevels: 2 },
  { id: 2, title: 'Family', description: 'My Home', color: 'blue', icon: '🏠', unlocked: true, totalLevels: 5, completedLevels: 0 },
  { id: 3, title: 'Colors', description: 'Rainbow Fun', color: 'purple', icon: '🌈', unlocked: false, totalLevels: 5, completedLevels: 0 },
  { id: 4, title: 'Animals', description: 'Jungle Trip', color: 'orange', icon: '🦁', unlocked: false, totalLevels: 5, completedLevels: 0 },
  { id: 5, title: 'Food', description: 'Yummy!', color: 'red', icon: '🍎', unlocked: false, totalLevels: 5, completedLevels: 0 },
  { id: 6, title: 'City', description: 'Let\'s Go', color: 'teal', icon: '🚗', unlocked: false, totalLevels: 5, completedLevels: 0 },
];

// Floating Clouds Component
const BackgroundClouds = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="cloud animate-float" style={{ top: '10%', left: '10%', transform: 'scale(1.5)', opacity: 0.6 }}></div>
    <div className="cloud animate-float-delayed" style={{ top: '25%', right: '15%', transform: 'scale(1.2)', opacity: 0.4 }}></div>
    <div className="cloud animate-float-slow" style={{ top: '60%', left: '-5%', transform: 'scale(2)', opacity: 0.3 }}></div>
    <div className="cloud animate-float" style={{ bottom: '10%', right: '5%', transform: 'scale(1.8)', opacity: 0.5 }}></div>
  </div>
);

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.ONBOARDING_WELCOME);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    age: 8,
    gender: Gender.BOY,
    parentPhone: '+92 ',
    languageGoal: null,
  });

  const [showWelcome, setShowWelcome] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [mascotText, setMascotText] = useState<string | null>(null);
  
  // Voice & Interaction State
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackData, setFeedbackData] = useState<ChatResponse | null>(null);

  useEffect(() => {
    setShowWelcome(true);
  }, []);

  const startExperience = () => {
     setScreen(AppScreen.ONBOARDING_PROFILE);
  };

  const startListening = async () => {
    // 1. Initialize Audio Context immediately on user click to prevent autoplay blocking
    await ensureAudioContextReady();

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Browser doesn't support speech recognition.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US'; 
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      setMascotText("Listening... 👂");
      setFeedbackData(null);

      recognition.start();

      recognition.onresult = async (event: any) => {
        const userText = event.results[0][0].transcript;
        setIsListening(false);
        handleVoiceInput(userText);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        
        // Handle specific errors
        let msg = "Oops! Can't hear you 🙊";
        if (event.error === 'not-allowed') {
          msg = "Allow Mic Access 🎤";
        } else if (event.error === 'audio-capture') {
          msg = "No Mic Found 🎙️";
        }
        
        setMascotText(msg);
        setTimeout(() => setMascotText(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setIsListening(false);
      setMascotText("Error starting mic ❌");
    }
  };

  const handleVoiceInput = async (text: string) => {
    setIsProcessing(true);
    setMascotText("Thinking... 🤔");
    setMascotState('idle'); 

    // 1. Send text to Gemini
    const result = await chatWithChhutku(text);
    setFeedbackData(result);
    setMascotText(result.replyText);
    setIsProcessing(false);

    // 2. Play Audio
    if (result.replyText) {
       await playChhutkuVoice(result.replyText);
    }

    // 3. Animate based on result
    if (result.isCorrect) {
       setMascotState('success');
       setTimeout(() => {
         setMascotState('idle');
         setMascotText(null);
         setFeedbackData(null); // Clear feedback after celebration
       }, 5000);
    } else {
       setMascotState('dancing'); // "Encouraging" movement
       // Feedback stays on screen until next interaction
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setUserProfile(prev => ({ ...prev, [field]: value }));
  };

  const renderOnboardingWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center relative z-10">
      <div className={`z-10 transition-all duration-1000 transform ${showWelcome ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <h1 className="text-6xl font-poppins font-black text-white drop-shadow-lg mb-2 tracking-tight">
          BolBuddy
        </h1>
        <p className="text-2xl text-white/90 font-nunito font-bold mb-16 shadow-black/10 text-shadow-lg">Shy to Hi!</p>
        
        {/* Animated Mascot Entrance */}
        <div className="w-72 h-72 mx-auto mb-16 relative animate-float">
           <div className="absolute inset-0 bg-white/40 rounded-full blur-3xl animate-pulse-glow"></div>
           <img 
              src="https://picsum.photos/id/1005/500/500" 
              alt="Chhutku" 
              className="relative rounded-[3rem] -rotate-6 border-[6px] border-white/60 shadow-2xl"
           />
           {/* Decorative floating elements */}
           <div className="absolute -top-4 -right-4 text-4xl animate-bounce">✨</div>
           <div className="absolute bottom-4 -left-4 text-4xl animate-bounce" style={{animationDelay: '0.5s'}}>🚀</div>
        </div>

        <Button3D fullWidth onClick={startExperience} className="text-2xl py-6 shadow-xl">
          Let's Start! <ArrowRight className="w-6 h-6 ml-2" />
        </Button3D>
      </div>
    </div>
  );

  const renderOnboardingProfile = () => (
    <div className="min-h-screen p-6 flex flex-col justify-center relative z-10">
       <div className="absolute top-10 left-0 w-full flex justify-center">
         <h2 className="text-3xl font-poppins font-black text-white drop-shadow-md">Who are you?</h2>
       </div>

       <GlassCard className="w-full max-w-md mx-auto transform hover:scale-[1.02] transition-transform">
          <GlowingInput 
            label="What is your name?" 
            value={userProfile.name} 
            onChange={(e) => handleInputChange('name', e.target.value)} 
            placeholder="e.g. Ali"
          />
          
          <div className="mb-8">
             <label className="block text-white font-nunito font-extrabold mb-3 ml-1 text-shadow-sm">I want to...</label>
             <div className="flex gap-4">
                {[LanguageGoal.LEARN_ENGLISH, LanguageGoal.LEARN_URDU].map((goal) => (
                   <button
                     key={goal}
                     onClick={() => handleInputChange('languageGoal', goal)}
                     className={`flex-1 p-6 rounded-3xl border-4 transition-all duration-300 relative overflow-hidden group shadow-xl ${
                       userProfile.languageGoal === goal 
                       ? 'bg-blue-500 border-white scale-105 shadow-neon' 
                       : 'bg-white/30 border-transparent hover:bg-white/40'
                     }`}
                   >
                      <Globe className={`w-10 h-10 mb-3 mx-auto drop-shadow-md ${userProfile.languageGoal === goal ? 'text-white animate-spin-slow' : 'text-white/80'}`} />
                      <div className="text-white font-black text-sm uppercase tracking-wide">{goal}</div>
                   </button>
                ))}
             </div>
          </div>

          <div className="mb-10">
            <label className="block text-white font-nunito font-extrabold mb-3 ml-1 text-shadow-sm">I am a...</label>
            <div className="flex bg-white/20 rounded-2xl p-2 shadow-inner">
               {Object.values(Gender).map((g) => (
                  <button
                    key={g}
                    onClick={() => handleInputChange('gender', g)}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                      userProfile.gender === g ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {g}
                  </button>
               ))}
            </div>
          </div>

          <Button3D variant="accent" fullWidth onClick={() => setScreen(AppScreen.DASHBOARD)} className="text-xl py-5">
            START ADVENTURE!
          </Button3D>
       </GlassCard>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen relative pb-32 overflow-y-auto no-scrollbar z-10">
      <TopBar />
      
      {/* Scrollable Area */}
      <div className="pt-2 relative">
        <DailyGoalRing />
        
        {/* CORRECTION / FEEDBACK OVERLAY (Only if there's a correction) */}
        {feedbackData && !feedbackData.isCorrect && feedbackData.correction && (
            <div className="absolute top-48 left-1/2 -translate-x-1/2 w-full px-6 z-40 animate-pop-in">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border-2 border-red-300">
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-5 h-5 text-red-500" />
                        <span className="font-bold text-red-500 uppercase text-xs">Correction</span>
                    </div>
                    <div className="text-gray-800 text-lg font-bold mb-2">
                         {feedbackData.correction}
                    </div>
                    <div className="bg-green-100 text-green-700 text-sm p-2 rounded-lg font-bold border border-green-200">
                         Try saying it again!
                    </div>
                </div>
            </div>
        )}

        {/* Central Mic Orb */}
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-30">
           {/* If correction is showing, push mic down slightly or keep it. Let's adjust z-index to overlay. */}
           <button 
             onClick={isListening || isProcessing ? undefined : startListening}
             disabled={isListening || isProcessing}
             className={`w-20 h-20 rounded-full p-1 shadow-[0_0_30px_rgba(244,63,94,0.6)] cursor-pointer hover:scale-110 active:scale-90 transition-transform flex items-center justify-center group
                ${isListening ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' : 'bg-gradient-to-r from-pink-500 to-rose-500 animate-pulse-glow'}
                ${isProcessing ? 'opacity-80' : 'opacity-100'}
             `}
           >
              <div className="w-full h-full rounded-full border-4 border-white flex items-center justify-center bg-gradient-to-b from-rose-400 to-rose-600 relative overflow-hidden">
                  <div className={`absolute inset-0 bg-white/20 rounded-full scale-0 transition-transform duration-500 ${isListening ? 'scale-100 animate-ping' : 'group-hover:scale-100'}`}></div>
                  <Mic className={`w-8 h-8 text-white ${mascotState === 'dancing' ? 'animate-bounce' : 'animate-wiggle'}`} />
              </div>
           </button>
        </div>

        <div className="px-4 mt-20 flex flex-col items-center pb-32 pt-10">
           {ISLANDS_DATA.map((island, index) => (
             <IslandNode key={island.id} data={island} index={index} />
           ))}
        </div>
      </div>

      <Mascot state={mascotState} speechBubbleText={mascotText} />
      <BottomNav currentScreen={screen} onNavigate={setScreen} />
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-hidden shadow-2xl bg-transparent">
      <BackgroundClouds />
      
      {screen === AppScreen.ONBOARDING_WELCOME && renderOnboardingWelcome()}
      {screen === AppScreen.ONBOARDING_PROFILE && renderOnboardingProfile()}
      {screen === AppScreen.DASHBOARD && renderDashboard()}
      {screen === AppScreen.PARENTS && <ParentDashboard onBack={() => setScreen(AppScreen.DASHBOARD)} />}
    </div>
  );
};

export default App;