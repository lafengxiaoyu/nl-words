import { useState, useRef } from "react";

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
  
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef(false);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    isDragging.current = true;
    isHorizontalSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX.current;
    const deltaY = touchY - startY.current;
    
    // Determine if it's a horizontal swipe
    if (!isHorizontalSwipe.current) {
      // First, check if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isHorizontalSwipe.current = true;
        // Set CSS to prevent scrolling on the document body
        if (typeof document !== 'undefined') {
          document.body.style.overflow = 'hidden';
        }
      }
    }
    
    currentX.current = touchX;
    
    if (cardRef.current && isHorizontalSwipe.current) {
      cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)${isFlipped ? ' rotateY(180deg)' : ''}`;
      cardRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    isHorizontalSwipe.current = false;
    
    // Restore scrolling
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    
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
      isHorizontalSwipe.current = false;
      
      // Restore scrolling
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      
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
        <div className="card-front">
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