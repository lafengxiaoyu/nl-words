import { useState, useRef, useEffect } from "react";

interface FlashcardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}

export function Flashcard({ 
  frontContent, 
  backContent,
  onSwipeRight,
  onSwipeLeft 
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHorizontalSwipe, setIsHorizontalSwipeState] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipeRef = useRef(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isHorizontalSwipe ? 'hidden' : '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isHorizontalSwipe]);

  // 翻转时立即隐藏正面的元素（难度标签、收藏按钮、音量按钮）
  useEffect(() => {
    if (!frontRef.current) return;
    
    // 使用更具体的选择器
    const difficultyEl = frontRef.current.querySelector('.card-difficulty') as HTMLElement;
    const metaEl = frontRef.current.querySelector('.card-front-meta') as HTMLElement;
    const speakBtnEl = frontRef.current.querySelector('.speak-btn') as HTMLElement;
    
    const elements = [difficultyEl, metaEl, speakBtnEl].filter(Boolean);
    
    if (isFlipped) {
      // 立即隐藏，不使用requestAnimationFrame以确保零延迟
      elements.forEach((el) => {
        if (el) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.style.transform = 'scale(0)';
          el.style.transition = 'none';
        }
      });
    } else {
      // 恢复显示
      elements.forEach((el) => {
        if (el) {
          el.style.display = '';
          el.style.visibility = '';
          el.style.opacity = '';
          el.style.pointerEvents = '';
          el.style.transform = '';
          el.style.transition = '';
        }
      });
    }
  }, [isFlipped]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    isDragging.current = true;
    isHorizontalSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX.current;
    const deltaY = touchY - startY.current;
    
    // Determine if it's a horizontal swipe
    if (!isHorizontalSwipeRef.current) {
      // First, check if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isHorizontalSwipeRef.current = true;
        setIsHorizontalSwipeState(true);
      }
    }
    
    currentX.current = touchX;
    
    if (cardRef.current && isHorizontalSwipeRef.current) {
      cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)${isFlipped ? ' rotateY(180deg)' : ''}`;
      cardRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    isHorizontalSwipeRef.current = false;
    setIsHorizontalSwipeState(false);
    
    const diff = currentX.current - startX.current;
    const threshold = 80;
    
    if (Math.abs(diff) > threshold) {
      handleSwipe(diff > 0);
    } else if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease';
      cardRef.current.style.transform = '';
    }
    
    startX.current = 0;
    startY.current = 0;
    currentX.current = 0;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    currentX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)${isFlipped ? ' rotateY(180deg)' : ''}`;
      cardRef.current.style.transition = 'none';
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const diff = currentX.current - startX.current;
    const threshold = 80;
    
    if (Math.abs(diff) > threshold) {
      handleSwipe(diff > 0);
    } else if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease';
      cardRef.current.style.transform = '';
    }

    startX.current = 0;
    currentX.current = 0;
  };

  const handleSwipe = (isRight: boolean) => {
    const exitX = isRight ? '120%' : '-120%';
    const exitRotate = isRight ? '12deg' : '-12deg';
    
    if (cardRef.current) {
      cardRef.current.style.transition = 'all 0.3s ease';
      cardRef.current.style.transform = `translateX(${exitX}) rotate(${exitRotate})`;
      cardRef.current.style.opacity = '0';
    }

    // Call callback and reset after animation
    setTimeout(() => {
      setIsFlipped(false);
      if (cardRef.current) {
        cardRef.current.style.transform = '';
        cardRef.current.style.opacity = '1';
      }
      if (isRight && onSwipeRight) onSwipeRight();
      if (!isRight && onSwipeLeft) onSwipeLeft();
    }, 300);
  };

  const handleFlip = () => {
    const diff = Math.abs(currentX.current - startX.current);
    if (diff > 10) return;
    setIsFlipped(!isFlipped);
  };

  const handleTouchCancel = () => {
    // Clean up when touch is cancelled (e.g., by system)
    if (isDragging.current) {
      isDragging.current = false;
      isHorizontalSwipeRef.current = false;
      setIsHorizontalSwipeState(false);
      
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease';
        cardRef.current.style.transform = '';
      }
      
      startX.current = 0;
      startY.current = 0;
      currentX.current = 0;
    }
  };

  return (
    <div className="flashcard-wrapper">
      <div
        ref={cardRef}
        className={`word-card ${isFlipped ? 'flipped' : ''}`}
        onClick={handleFlip}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Front of Card */}
        <div ref={frontRef} className="card-front">
          {frontContent}
        </div>

        {/* Back of Card */}
        <div className="card-back">
          {backContent}
        </div>
      </div>
    </div>
  );
}
