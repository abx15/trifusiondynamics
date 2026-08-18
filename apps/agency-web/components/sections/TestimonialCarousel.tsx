"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Testimonial } from "@/lib/cms-static-data";

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export default function TestimonialCarousel({ testimonials }: TestimonialsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="py-16 sm:py-24 bg-[#090d19] relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-0 h-[250px] w-[250px] rounded-full bg-secondary/5 blur-[90px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="max-w-3xl text-center mx-auto mb-12 sm:mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Testimonials</h2>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Loved By Growing Startups &amp; SMBs
          </p>
        </div>

        {/* Desktop Grid Layout (hidden on touch/mobile < md) */}
        <div className="hidden md:grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((test) => (
            <div
              key={test.id}
              className="glass-panel rounded-3xl p-8 sm:p-10 relative flex flex-col justify-between"
            >
              <Quote className="absolute top-6 right-8 h-10 w-10 text-white/5 pointer-events-none" />
              
              <div>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed italic mb-8 relative z-10">
                  &ldquo;{test.quote}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                  <Image
                    src={test.avatar}
                    alt={test.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    {test.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {test.role}, <span className="text-primary">{test.company}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Swipeable Embla Carousel (visible < md) */}
        <div className="block md:hidden max-w-lg mx-auto">
          <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((test) => (
                <div
                  key={test.id}
                  className="flex-[0_0_100%] min-w-0 pr-0"
                >
                  <div className="glass-panel rounded-3xl p-6 sm:p-8 relative flex flex-col justify-between h-full">
                    <Quote className="absolute top-6 right-6 h-8 w-8 text-white/5 pointer-events-none" />
                    
                    <p className="text-slate-300 text-sm leading-relaxed italic mb-6 relative z-10">
                      &ldquo;{test.quote}&rdquo;
                    </p>

                    <div className="flex items-center gap-3.5 border-t border-white/5 pt-4">
                      <div className="relative h-11 w-11 rounded-full overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        <Image
                          src={test.avatar}
                          alt={test.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {test.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {test.role}, <span className="text-primary">{test.company}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Carousel Controls & Dots */}
          <div className="flex items-center justify-between mt-6 px-2">
            <button
              onClick={scrollPrev}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white active:scale-95 transition-transform"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === selectedIndex ? "w-6 bg-primary" : "w-2.5 bg-white/20"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={scrollNext}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white active:scale-95 transition-transform"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
