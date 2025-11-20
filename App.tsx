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
      
      if (storedData) {
        const { date, questions: storedQuestions } = JSON.parse(storedData);
        if (date === today && storedQuestions.length > 0) {
          setQuestions(storedQuestions);
          setGameState(GameState.Playing);
          setIsLoading(false);
          return;
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
    <div className="text-center max-w-3xl mx-auto px-4">
      <div className="bg-indigo-600/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 animate-pulse ring-4 ring-indigo-500/30">
        <SparklesIcon className="w-12 h-12 text-indigo-400" />
      </div>
      <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text drop-shadow-2xl tracking-tight">
        Daily English
      </h1>
      <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
        Master the language with 6 AI-crafted questions every day.
      </p>

      <div className="mb-12 bg-gray-800/40 p-8 rounded-3xl border border-gray-700/50 backdrop-blur-xl shadow-xl">
        <h2 className="text-sm text-gray-400 mb-6 font-bold uppercase tracking-widest">Select Your Level</h2>
        <div className="flex justify-center items-center gap-4 flex-wrap">
          {Object.values(Difficulty).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedDifficulty(level)}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 ${
                selectedDifficulty === level
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40 scale-105 ring-2 ring-white/20'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
         <div className="flex flex-col items-center space-y-6 py-4">
            <div className="flex space-x-3">
                <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-indigo-300 animate-pulse font-medium text-lg">Gemini is crafting your quiz...</p>
         </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-8 py-6 rounded-2xl max-w-lg mx-auto shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-center mb-4 text-red-400">
            <XCircleIcon className="w-10 h-10" />
          </div>
          <p className="font-bold text-xl mb-2">Connection Error</p>
          <p className="text-base opacity-90 mb-6">{error}</p>
          <button 
            onClick={handleStartQuiz} 
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-600/40"
          >
            Try Again
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartQuiz}
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 overflow-hidden"
        >
          <span className="relative z-10 flex items-center text-xl">
            <SparklesIcon className="w-6 h-6 mr-3 group-hover:animate-spin" />
            Start Quiz
          </span>
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 transition-transform duration-500 ease-out"></div>
        </button>
      )}
    </div>
  );

  const renderQuizScreen = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8">
             <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
        </div>
        
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
            <div className="p-6 md:p-10 bg-gradient-to-b from-gray-800/50 to-transparent">
                <div className="min-h-[140px] flex items-center justify-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-100 text-center leading-relaxed" 
                        dangerouslySetInnerHTML={{ 
                            __html: currentQuestion.question.replace(/___/g, '<span class="inline-block border-b-4 border-indigo-500 text-indigo-300 px-3 mx-1 font-mono bg-indigo-900/30 rounded-t-lg">_____</span>') 
                        }} 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    let buttonClass = "bg-gray-700/40 hover:bg-gray-600/60 border-gray-600/50 text-gray-200 hover:border-indigo-500/50";
                    
                    if (feedback !== AnswerFeedback.None) {
                        if (option === currentQuestion.correctAnswer) {
                            buttonClass = "bg-green-500/20 border-green-500 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                        } else if (isSelected) {
                            buttonClass = "bg-red-500/20 border-red-500 text-red-100";
                        } else {
                            buttonClass = "bg-gray-800/30 border-gray-700/30 text-gray-600 opacity-50 cursor-not-allowed";
                        }
                    } else if (isSelected) {
                        buttonClass = "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/30";
                    }
                    
                    return (
                        <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={feedback !== AnswerFeedback.None}
                        className={`w-full p-6 rounded-2xl text-left text-lg font-medium border-2 transition-all duration-200 transform active:scale-[0.98] ${buttonClass}`}
                        >
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mr-3 ${isSelected || (feedback !== AnswerFeedback.None && option === currentQuestion.correctAnswer) ? 'bg-white/20 text-white' : 'bg-black/20 text-gray-400'}`}>
                            {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                        </button>
                    );
                    })}
                </div>
            </div>
            
            <div className="bg-gray-900/40 p-6 md:p-8 border-t border-gray-700/30">
                {feedback === AnswerFeedback.None ? (
                <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 disabled:shadow-none"
                >
                    Submit Answer
                </button>
                ) : (
                <div className="animate-fadeIn">
                    <div className={`flex items-center justify-center p-6 rounded-2xl mb-6 border ${feedback === AnswerFeedback.Correct ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                        {feedback === AnswerFeedback.Correct ? (
                            <div className="flex items-center text-green-400 text-2xl font-bold">
                                <CheckCircleIcon className="w-8 h-8 mr-3" />
                                Correct! Well done.
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center w-full">
                                <div className="flex items-center text-red-400 text-xl font-bold mb-3">
                                    <XCircleIcon className="w-8 h-8 mr-3" />
                                    Incorrect
                                </div>
                                <div className="w-full h-px bg-red-500/20 mb-3"></div>
                                <p className="text-gray-300 text-lg">
                                    Correct Answer: <span className="text-green-400 font-bold ml-1">{currentQuestion.correctAnswer}</span>
                                </p>
                            </div>
                        )}
                    </div>
                    <button
                    onClick={handleNextQuestion}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl text-xl transition-all duration-300 shadow-lg transform hover:-translate-y-1"
                    >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Show Results'}
                    </button>
                </div>
                )}
            </div>
        </div>
      </div>
    );
  };
  
  const renderFinishedScreen = () => (
    <div className="w-full max-w-3xl mx-auto p-8 md:p-12 bg-gray-800/60 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-700/50 text-center animate-fadeIn">
      <div className="inline-block p-4 rounded-full bg-indigo-500/20 mb-6 ring-4 ring-indigo-500/10">
          <SparklesIcon className="w-16 h-16 text-yellow-400" />
      </div>
      <h2 className="text-5xl font-black mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">Quiz Complete!</h2>
      
      <div className="my-10 py-8 bg-gray-900/50 rounded-3xl border border-gray-700/30 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
        <p className="text-gray-400 text-sm uppercase tracking-[0.2em] mb-4 font-bold">Final Score</p>
        <div className="text-7xl font-black text-white mb-4 tracking-tighter flex justify-center items-baseline">
            <span className={`transform transition-transform duration-500 group-hover:scale-110 ${score >= 4 ? "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" : score >= 2 ? "text-yellow-400" : "text-red-400"}`}>{score}</span>
            <span className="text-4xl text-gray-600 ml-2">/{questions.length}</span>
        </div>
        <p className="text-indigo-200 font-medium text-lg">
            {score === 6 ? "Perfect Score! You're a genius! 🌟" : 
             score >= 4 ? "Great job! Keep it up! 🎉" : 
             "Keep practicing, you'll get there! 💪"}
        </p>
      </div>
      
      <div className="text-left space-y-4 mb-10 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
        <h3 className="text-xl font-bold text-white mb-4 sticky top-0 bg-gray-800/95 py-3 z-10 flex items-center border-b border-gray-700">
            <span className="mr-2">📝</span> Review Summary
        </h3>
        {userAnswers.map((answer, index) => (
          <div key={index} className={`p-5 rounded-2xl border transition-colors duration-200 ${answer.isCorrect ? 'bg-green-900/10 border-green-500/20 hover:border-green-500/40' : 'bg-red-900/10 border-red-500/20 hover:border-red-500/40'}`}>
            <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-900/50 px-2 py-1 rounded">Question {index + 1}</span>
                {answer.isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-400" /> : <XCircleIcon className="w-6 h-6 text-red-400" />}
            </div>
            <p className="font-medium text-gray-100 mb-4 text-lg leading-snug">{answer.question}</p>
            <div className="flex flex-col sm:flex-row gap-3 text-sm">
                <div className={`flex-1 p-3 rounded-xl border ${answer.isCorrect ? 'bg-green-500/10 text-green-200 border-green-500/20' : 'bg-red-500/10 text-red-200 border-red-500/20'}`}>
                    <span className="block text-xs opacity-70 uppercase font-bold mb-1">Your Answer</span>
                    <strong className="text-base">{answer.selectedAnswer}</strong>
                </div>
                {!answer.isCorrect && (
                    <div className="flex-1 p-3 rounded-xl bg-green-500/10 text-green-200 border border-green-500/20">
                        <span className="block text-xs opacity-70 uppercase font-bold mb-1">Correct Answer</span>
                        <strong className="text-base">{answer.correctAnswer}</strong>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={() => setGameState(GameState.Start)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-12 rounded-full text-xl transition-all duration-300 shadow-xl hover:shadow-indigo-500/50 transform hover:-translate-y-1"
      >
        Play Again
      </button>
    </div>
  );

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-900 to-black text-white font-sans selection:bg-indigo-500/30">
      {gameState === GameState.Start && renderStartScreen()}
      {gameState === GameState.Playing && renderQuizScreen()}
      {gameState === GameState.Finished && renderFinishedScreen()}
    </main>
  );
};

export default App;