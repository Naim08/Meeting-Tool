'use client';

import { useEffect, useState } from 'react';

export default function ChatDemo() {
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [stage, setStage] = useState<'idle' | 'typing' | 'responding' | 'complete'>('idle');

  const userQuestion = "How do I implement FizzBuzz in Python?";
  const aiResponse = `Here's a clean FizzBuzz solution:

for i in range(1, 101):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)

Key points to mention:
• Check 15 first (divisible by both)
• Use modulo operator (%)
• Range goes from 1 to 100`;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Start typing after 1 second
    if (stage === 'idle') {
      timeout = setTimeout(() => setStage('typing'), 1000);
    }
    
    // Animate user typing
    if (stage === 'typing' && userText.length < userQuestion.length) {
      timeout = setTimeout(() => {
        setUserText(userQuestion.slice(0, userText.length + 1));
      }, 50); // 50ms per character
    } else if (stage === 'typing' && userText.length === userQuestion.length) {
      timeout = setTimeout(() => setStage('responding'), 500);
    }
    
    // Animate AI response
    if (stage === 'responding' && aiText.length < aiResponse.length) {
      timeout = setTimeout(() => {
        setAiText(aiResponse.slice(0, aiText.length + 1));
      }, 20); // Faster typing for AI
    } else if (stage === 'responding' && aiText.length === aiResponse.length) {
      setStage('complete');
      // Loop after showing complete message for 3 seconds
      timeout = setTimeout(() => {
        setUserText('');
        setAiText('');
        setStage('idle');
      }, 3000);
    }
    
    return () => clearTimeout(timeout);
  }, [stage, userText, aiText, userQuestion, aiResponse]);

  return (
    <div className="absolute inset-0 flex items-start justify-center pt-2 lg:pt-12 pointer-events-none">
      <div 
        className="flex w-[90%] max-w-2xl origin-top flex-col rounded-2xl bg-gradient-to-b from-[#21232a]/50 to-[#21232a]/80 backdrop-blur-xs overflow-hidden"
        style={{
          boxShadow: '0 0 0 1px rgba(207, 226, 255, 0.24), 0 -0.5px 0 0 rgba(255, 255, 255, 0.8), 0 174px 49px 0 rgba(0, 0, 0, 0.00), 0 112px 45px 0 rgba(0, 0, 0, 0.08), 0 63px 38px 0 rgba(0, 0, 0, 0.14), 0 28px 28px 0 rgba(0, 0, 0, 0.16), 0 7px 15px 0 rgba(0, 0, 0, 0.2)',
          maxHeight: '500px'
        }}
      >
        {/* Chat content */}
        <div className="flex-1 flex flex-col gap-3 p-5 overflow-y-auto">
          {/* User message */}
          {userText && (
            <div className="flex w-full justify-end">
              <div className="relative overflow-hidden rounded-2xl rounded-br-md px-4 py-2 text-base text-[#CBE3FF] bg-[#2563eb]/80">
                {userText}
                {stage === 'typing' && <span className="animate-pulse">|</span>}
              </div>
            </div>
          )}
          
          {/* AI response */}
          {aiText && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-[#7B828E]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                  <path fillRule="evenodd" clipRule="evenodd" d="M11.9497 2.05026C9.21608 -0.683418 4.78393 -0.683418 2.05026 2.05026C-0.683418 4.78393 -0.683418 9.21608 2.05026 11.9497C4.78393 14.6834 9.21608 14.6834 11.9497 11.9497C14.6834 9.21608 14.6834 4.78393 11.9497 2.05026ZM3.17804 3.17804C5.28885 1.06723 8.71116 1.06723 10.822 3.17804C12.9328 5.28885 12.9328 8.71116 10.822 10.822C10.5853 11.0586 10.3323 11.2687 10.0664 11.4522L10.0701 11.4485C8.30532 9.68373 8.30532 6.82247 10.0701 5.05769L10.3207 4.80707L9.19293 3.67929L8.94232 3.92991C7.17754 5.69469 4.31627 5.69469 2.55149 3.92991L2.54779 3.93361C2.73135 3.66773 2.94144 3.41465 3.17804 3.17804ZM3.78324 11.3445C5.18177 12.3827 6.96794 12.6587 8.57252 12.1724C7.56099 10.964 7.08953 9.4567 7.15811 7.96969L3.78324 11.3445ZM1.82764 5.42748C3.03602 6.43901 4.5433 6.91047 6.03031 6.84189L2.65546 10.2168C1.61726 8.81823 1.34132 7.03206 1.82764 5.42748Z" fill="currentColor" />
                </svg>
                <p>AI Assistant</p>
              </div>
              <div className="w-full text-sm leading-[1.4] tracking-[-0.005em] text-[#F2F2F5] font-mono whitespace-pre-wrap">
                {aiText}
                {stage === 'responding' && <span className="animate-pulse">|</span>}
              </div>
            </div>
          )}
        </div>
        
        {/* Input field at bottom */}
        <div className="border-t border-white/10 p-4 bg-[#1a1c22]/50">
          <div className="flex items-center gap-3 text-sm text-[#7B828E] mb-2">
            <button className="flex items-center gap-1.5 text-white/80 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" />
              </svg>
              <span>What should I say?</span>
            </button>
            <span className="text-white/30">•</span>
            <button className="flex items-center gap-1.5 text-white/50 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
              </svg>
              <span>Follow-up questions</span>
            </button>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask, ⌘⏎ to start typing"
              className="w-full bg-[#2a2d35] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#7B828E] focus:outline-none focus:border-white/20"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}

