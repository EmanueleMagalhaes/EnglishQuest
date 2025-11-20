import React, { useState } from 'react';
import { fetchDailyQuizQuestions } from './services/geminiService';
import { QuizQuestion, UserAnswer, GameState, AnswerFeedback, Difficulty } from './types';
import ProgressBar from './components/ProgressBar';
import { CheckCircleIcon, XCircleIcon, SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback>(AnswerFeedback.None);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.Intermediate);

  const handleStartQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSelectedAnswer(null);
    setFeedback(AnswerFeedback.None);

    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `dailyEnglishQuiz-${selectedDifficulty}`;
      const storedData = localStorage.getItem(storageKey);
      
      // Simple check to see if we have valid cached data for today
      if (storedData) {
        try {
            const { date, questions: storedQuestions } = JSON.parse(storedData);
            if (date === today && Array.isArray(storedQuestions) && storedQuestions.length > 0) {
            setQuestions(storedQuestions);
            setGameState(GameState.Playing);
            setIsLoading(false);
            return;
            }
        } catch (e) {
            localStorage.removeItem(storageKey);
        }
      }

      const newQuestions = await fetchDailyQuizQuestions(selectedDifficulty);
      if (!newQuestions || newQuestions.length === 0) {
        throw new Error("The API returned no questions. Please try again.");
      }
      setQuestions(newQuestions);
      localStorage.setItem(storageKey, JSON.stringify({ date: today, questions: newQuestions }));
      setGameState(GameState.Playing);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (feedback !== AnswerFeedback.None) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    setFeedback(isCorrect ? AnswerFeedback.Correct : AnswerFeedback.Incorrect);

    setUserAnswers(prev => [
      ...prev,
      {
        question: currentQuestion.question,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setFeedback(AnswerFeedback.None);
    } else {
      setGameState(GameState.Finished);
    }
  };

  const score = userAnswers.filter(answer => answer.isCorrect).length;

  const renderStartScreen = () => (
    <div className="text-center max-w-3xl mx-auto px-6 animate-fadeIn">
      <div className="relative mb-8 inline-block">
         <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-30 rounded-full animate-pulse"></div>
         <div className="relative bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-[2.5rem] w-32 h-32 flex items-center justify-center mx-auto border border-white/10 backdrop-blur-md shadow-2xl ring-1 ring-white/20">
            <SparklesIcon className="w-16 h-16 text-indigo-300 drop-shadow-[0_0_15px_rgba(165,180,252,0.5)]" />
         </div>
      </div>
      
      <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 text-transparent bg-clip-text drop-shadow-sm tracking-tight">
        Daily English
      </h1>
      <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
        Elevate your vocabulary and grammar with AI-curated challenges tailored to your level.
      </p>

      <div className="mb-12 p-1 bg-gray-800/40 rounded-3xl border border-gray-700/50 inline-flex backdrop-blur-xl shadow-xl relative z-10">
        <div className="flex space-x-1">
          {Object.values(Difficulty).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedDifficulty(level)}
              className={`px-8 py-3 rounded-[1.3rem] font-bold text-sm transition-all duration-300 ${
                selectedDifficulty === level
                  ? 'bg-gray-700 text-white shadow-lg ring-1 ring-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
         <div className="flex flex-col items-center space-y-6 py-8">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-indigo-200 animate-pulse font-medium text-lg tracking-wide">Designing your curriculum...</p>
         </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-8 py-8 rounded-3xl max-w-lg mx-auto shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-center mb-4">
             <div className="bg-red-500/20 p-3 rounded-full">
                <XCircleIcon className="w-8 h-8 text-red-400" />
             </div>
          </div>
          <p className="font-bold text-xl mb-2">Configuration Error</p>
          <p className="text-sm opacity-80 mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
            <button 
                onClick={handleStartQuiz} 
                className="w-full px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-600/20"
            >
                Try Again
            </button>
            
            {(error.includes("API Key") || error.includes("API_KEY")) && (
                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all text-sm flex items-center justify-center"
                >
                    Get API Key from Google →
                </a>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartQuiz}
          className="group relative inline-flex items-center justify-center px-12 py-5 font-bold text-white transition-all duration-300 bg-indigo-600 rounded-2xl hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] focus:outline-none focus:ring-4 focus:ring-indigo-500/30 overflow-hidden ring-1 ring-white/20"
        >
          <span className="relative z-10 flex items-center text-lg tracking-wide">
            Start Session
          </span>
        </button>
      )}
    </div>
  );

  const renderQuizScreen = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="mb-10">
             <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
        </div>
        
        <div className="bg-gray-900/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="p-8 md:p-12">
                <div className="min-h-[120px] flex items-center justify-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-medium text-gray-100 text-center leading-relaxed tracking-wide" 
                        dangerouslySetInnerHTML={{ 
                            __html: currentQuestion.question.replace(/___/g, '<span class="inline-block border-b-2 border-indigo-400 text-indigo-300 px-4 mx-2 font-mono bg-indigo-500/10 rounded-t transition-colors">_____</span>') 
                        }} 
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    let buttonClass = "bg-white/5 hover:bg-white/10 border-white/5 text-gray-300";
                    let ringClass = "";
                    
                    if (feedback !== AnswerFeedback.None) {
                        if (option === currentQuestion.correctAnswer) {
                            buttonClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
                            ringClass = "ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                        } else if (isSelected) {
                            buttonClass = "bg-rose-500/20 border-rose-500/50 text-rose-100";
                            ringClass = "ring-1 ring-rose-500/50";
                        } else {
                             buttonClass = "bg-black/20 text-gray-600 border-transparent opacity-60";
                        }
                    } else if (isSelected) {
                        buttonClass = "bg-indigo-600 text-white border-indigo-500";
                        ringClass = "ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/20";
                    }
                    
                    return (
                        <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={feedback !== AnswerFeedback.None}
                        className={`w-full p-5 rounded-2xl text-left text-lg font-medium border transition-all duration-200 transform active:scale-[0.99] flex items-center group ${buttonClass} ${ringClass}`}
                        >
                        <span className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold mr-5 transition-colors ${isSelected || (feedback !== AnswerFeedback.None && option === currentQuestion.correctAnswer) ? 'bg-white/20 text-white' : 'bg-black/20 text-gray-500 group-hover:bg-black/30'}`}>
                            {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                        </button>
                    );
                    })}
                </div>
            </div>
            
            <div className="bg-black/20 p-6 md:p-8 border-t border-white/5 backdrop-blur-sm">
                {feedback === AnswerFeedback.None ? (
                <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full bg-white text-indigo-950 hover:bg-gray-100 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed font-bold py-4 px-6 rounded-xl text-lg transition-all duration-300 shadow-lg shadow-indigo-900/20 disabled:shadow-none transform active:scale-[0.99]"
                >
                    Check Answer
                </button>
                ) : (
                <div className="animate-fadeIn flex flex-col md:flex-row gap-4 items-center">
                    <div className={`flex-grow flex items-center w-full p-4 rounded-xl border ${feedback === AnswerFeedback.Correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        {feedback === AnswerFeedback.Correct ? (
                            <div className="flex items-center text-emerald-400 font-bold">
                                <CheckCircleIcon className="w-6 h-6 mr-3" />
                                Correct!
                            </div>
                        ) : (
                            <div className="flex flex-col w-full">
                                <div className="flex items-center text-rose-400 font-bold mb-1">
                                    <XCircleIcon className="w-5 h-5 mr-2" />
                                    Incorrect
                                </div>
                                <div className="text-sm text-rose-200/80">
                                    Answer: {currentQuestion.correctAnswer}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                    onClick={handleNextQuestion}
                    className="w-full md:w-auto min-w-[200px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 shadow-lg shadow-indigo-900/30 transform hover:-translate-y-0.5"
                    >
                    {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Results'}
                    </button>
                </div>
                )}
            </div>
        </div>
      </div>
    );
  };
  
  const renderFinishedScreen = () => (
    <div className="w-full max-w-4xl mx-auto p-8 md:p-12 bg-gray-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 text-center animate-fadeIn relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
      
      <div className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-8 ring-1 ring-white/10 shadow-2xl">
          <SparklesIcon className="w-12 h-12 text-indigo-300" />
      </div>
      
      <h2 className="text-4xl md:text-5xl font-bold mb-2 text-white tracking-tight">Session Complete</h2>
      <p className="text-gray-400 mb-10 text-lg">Here is how you performed today.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
         <div className="bg-gray-800/50 p-6 rounded-3xl border border-white/5">
             <div className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Score</div>
             <div className="text-5xl font-black text-white tracking-tighter">{score}<span className="text-2xl text-gray-500">/{questions.length}</span></div>
         </div>
         <div className="bg-gray-800/50 p-6 rounded-3xl border border-white/5 md:col-span-2 flex items-center justify-center">
             <div className="text-xl md:text-2xl font-medium text-indigo-200">
                 {score === 6 ? "Outstanding! A flawless performance. 🌟" : 
                  score >= 4 ? "Excellent work! You are mastering this. 🚀" : 
                  "Good practice. Consistency is key! 💪"}
             </div>
         </div>
      </div>
      
      <div className="text-left space-y-4 mb-12 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {userAnswers.map((answer, index) => (
          <div key={index} className={`p-6 rounded-2xl border transition-all duration-300 ${answer.isCorrect ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
            <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs font-bold opacity-50 uppercase tracking-wider">Question {index + 1}</span>
                {answer.isCorrect ? 
                    <span className="text-emerald-400 text-sm font-bold flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1"/> Correct</span> : 
                    <span className="text-rose-400 text-sm font-bold flex items-center"><XCircleIcon className="w-4 h-4 mr-1"/> Incorrect</span>
                }
            </div>
            <p className="font-medium text-gray-200 mb-4 text-lg leading-relaxed">{answer.question}</p>
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
                <div className={`flex-1 p-3 rounded-xl border ${answer.isCorrect ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                    <span className="block text-[10px] opacity-70 uppercase font-bold mb-1">You Selected</span>
                    <strong className="text-base block truncate">{answer.selectedAnswer}</strong>
                </div>
                {!answer.isCorrect && (
                    <div className="flex-1 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-200">
                        <span className="block text-[10px] opacity-70 uppercase font-bold mb-1">Correct Answer</span>
                        <strong className="text-base block truncate">{answer.correctAnswer}</strong>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={() => setGameState(GameState.Start)}
        className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 shadow-xl shadow-white/10 transform hover:-translate-y-1 ring-4 ring-gray-900"
      >
        Start New Session
      </button>
    </div>
  );

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0A0A0A] text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background Elements */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="relative z-10 w-full">
        {gameState === GameState.Start && renderStartScreen()}
        {gameState === GameState.Playing && renderQuizScreen()}
        {gameState === GameState.Finished && renderFinishedScreen()}
      </div>
    </main>
  );
};

export default App;