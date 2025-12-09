import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Testimonial interface matching the database schema
 */
interface Testimonial {
  id: number;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  avatarUrl: string | null;
  rating: number | null;
  featured: boolean | null;
}

/**
 * Star rating display component
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div 
      className="flex gap-0.5" 
      role="img" 
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating 
              ? "fill-yellow-400 text-yellow-400" 
              : "fill-gray-200 text-gray-200"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Individual testimonial card component
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initials = testimonial.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Quote icon */}
        <Quote 
          className="h-8 w-8 text-blue-500 opacity-50 mb-4" 
          aria-hidden="true" 
        />
        
        {/* Rating */}
        {testimonial.rating && (
          <div className="mb-4">
            <StarRating rating={testimonial.rating} />
          </div>
        )}
        
        {/* Quote text */}
        <blockquote className="flex-1 mb-6">
          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed italic">
            "{testimonial.quote}"
          </p>
        </blockquote>
        
        {/* Author info */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={testimonial.avatarUrl || undefined} 
              alt={`${testimonial.name}'s profile photo`} 
            />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {testimonial.name}
            </p>
            {(testimonial.role || testimonial.company) && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {testimonial.role}
                {testimonial.role && testimonial.company && " at "}
                {testimonial.company}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Testimonials carousel section for the landing page
 * Features accessible navigation and auto-rotation
 */
export function TestimonialsSection() {
  const { data: testimonials, isLoading } = trpc.testimonials.getActive.useQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Number of testimonials to show at once based on screen size
  const itemsPerView = 3;

  // Auto-rotate testimonials
  useEffect(() => {
    if (!testimonials || testimonials.length <= itemsPerView || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => 
        prev + 1 >= testimonials.length - itemsPerView + 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials, isPaused]);

  const goToPrevious = useCallback(() => {
    if (!testimonials) return;
    setCurrentIndex((prev) => 
      prev === 0 ? Math.max(0, testimonials.length - itemsPerView) : prev - 1
    );
  }, [testimonials]);

  const goToNext = useCallback(() => {
    if (!testimonials) return;
    setCurrentIndex((prev) => 
      prev + 1 >= testimonials.length - itemsPerView + 1 ? 0 : prev + 1
    );
  }, [testimonials]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      goToPrevious();
    } else if (e.key === "ArrowRight") {
      goToNext();
    }
  }, [goToPrevious, goToNext]);

  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900" aria-label="Customer testimonials">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Users Say
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join thousands of content creators who have transformed their social media presence with AccessAI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) {
    return null; // Don't render section if no testimonials
  }

  const visibleTestimonials = testimonials.slice(
    currentIndex, 
    currentIndex + itemsPerView
  );

  // If we don't have enough testimonials to fill the view, wrap around
  const displayTestimonials = visibleTestimonials.length < itemsPerView && testimonials.length >= itemsPerView
    ? [...visibleTestimonials, ...testimonials.slice(0, itemsPerView - visibleTestimonials.length)]
    : visibleTestimonials;

  return (
    <section 
      className="py-20 bg-gray-50 dark:bg-gray-900" 
      aria-label="Customer testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            What Our Users Say
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join thousands of content creators who have transformed their social media presence with AccessAI.
          </p>
        </div>

        {/* Testimonials carousel */}
        <div 
          className="relative"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer testimonials carousel"
        >
          {/* Navigation buttons */}
          {testimonials.length > itemsPerView && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg hidden md:flex"
                onClick={goToPrevious}
                aria-label="Previous testimonials"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg hidden md:flex"
                onClick={goToNext}
                aria-label="Next testimonials"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Testimonial cards */}
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            aria-live="polite"
          >
            {displayTestimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Testimonial ${currentIndex + index + 1} of ${testimonials.length}`}
              >
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          {testimonials.length > itemsPerView && (
            <div 
              className="flex justify-center gap-2 mt-8"
              role="tablist"
              aria-label="Testimonial pages"
            >
              {Array.from({ length: Math.ceil(testimonials.length / itemsPerView) }).map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    Math.floor(currentIndex / itemsPerView) === index
                      ? "bg-blue-600 w-6"
                      : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                  }`}
                  onClick={() => setCurrentIndex(index * itemsPerView)}
                  role="tab"
                  aria-selected={Math.floor(currentIndex / itemsPerView) === index}
                  aria-label={`Go to testimonial page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
