import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface GalleryItem {
    src: string;
    type?: 'image' | 'video';
}

interface CarouselProduct {
    parentId: number;
    variationId?: number;
    name: string;
    imageSrc: string;
    selectedColorOption: string;
    originalImages?: Array<GalleryItem>;
    isVideo?: boolean;
    // pass-through for navigation state
    [key: string]: any;
}

interface ProductImageCarouselProps {
    product: CarouselProduct;
    productLink: string;
    /** When false, video slides are hidden (every-other card in catalogue for performance) */
    allowVideo?: boolean;
}

const ProductImageCarousel = ({ product, productLink, allowVideo = true }: ProductImageCarouselProps) => {
    const navigate = useNavigate();

    // Convert full-size WooCommerce URL to a smaller thumbnail for catalogue cards
    // Only transforms -scaled images (guaranteed to have square thumbnails)
    const toThumbnail = useCallback((src: string, size = '768x768'): string => {
        if (!src || src === '/placeholder.png') return src;
        if (/-\d+x\d+\.(jpg|jpeg|png|webp)$/i.test(src)) return src;
        if (/-scaled\.(jpg|jpeg|png|webp)$/i.test(src)) {
            return src.replace(/-scaled\./, `-${size}.`);
        }
        return src;
    }, []);

    // Extract the base identifier from a WP image URL (strips size suffix and extension)
    const getImageBase = useCallback((src: string): string => {
        const filename = src.split('/').pop() || src;
        return filename.replace(/-(scaled|\d+x\d+)\.(jpg|jpeg|png|webp)$/i, '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
    }, []);

    const isVideoUrl = (src: string) => /\.(mp4|webm)(\?.*)?$/i.test(src);

    // Build gallery slides: mix of image and video items
    const gallerySlides = useMemo(() => {
        const slides: GalleryItem[] = [];
        const seenBases = new Set<string>();

        // Helper to add an image slide (deduped by base hash)
        const addImage = (src: string) => {
            if (!src || src === '/placeholder.png') return;
            const base = getImageBase(src);
            if (seenBases.has(base)) return;
            seenBases.add(base);
            slides.push({ src: toThumbnail(src), type: 'image' });
        };

        // Helper to add a video slide
        const addVideo = (src: string) => {
            if (!src || seenBases.has(src)) return;
            seenBases.add(src);
            slides.push({ src, type: 'video' });
        };

        // Build from originalImages which already has the correct order (images + videos mixed)
        if (product.originalImages && product.originalImages.length > 0) {
            for (const item of product.originalImages) {
                if (!item.src) continue;
                if (item.type === 'video' || isVideoUrl(item.src)) {
                    if (allowVideo) addVideo(item.src);
                    // if allowVideo=false, skip video slides entirely
                } else {
                    addImage(item.src);
                }
            }
        }

        // If nothing from originalImages, fall back to imageSrc
        if (slides.filter(s => s.type !== 'video').length === 0 && product.imageSrc && product.imageSrc !== '/placeholder.png') {
            if (isVideoUrl(product.imageSrc)) {
                if (allowVideo) addVideo(product.imageSrc);
            } else {
                addImage(product.imageSrc);
            }
        }

        // For video-eligible cards: move first video to position 0 so it autoplays immediately
        if (allowVideo) {
            const firstVideoIdx = slides.findIndex(s => s.type === 'video');
            if (firstVideoIdx > 0) {
                const [videoSlide] = slides.splice(firstVideoIdx, 1);
                slides.unshift(videoSlide);
            }
        }

        // Limit to 3 slides max for fast loading in catalogue cards
        const capped = slides.slice(0, 3);
        return capped.length > 0 ? capped : [{ src: '/placeholder.png', type: 'image' as const }];
    }, [product.imageSrc, product.originalImages, product.parentId, allowVideo, toThumbnail, getImageBase]);

    const hasMultiple = gallerySlides.length > 1;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const startXRef = useRef(0);
    const currentXRef = useRef(0);
    const didSwipeRef = useRef(false);

    const SWIPE_THRESHOLD = 30;

    // Reset index when product changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [product.imageSrc]);

    const handleStart = useCallback((clientX: number) => {
        startXRef.current = clientX;
        currentXRef.current = clientX;
        didSwipeRef.current = false;
        setIsDragging(true);
        setDragOffset(0);
    }, []);

    const handleMove = useCallback((clientX: number) => {
        currentXRef.current = clientX;
        const diff = clientX - startXRef.current;
        setDragOffset(diff);
        if (Math.abs(diff) > 10) {
            didSwipeRef.current = true;
        }
    }, []);

    const handleEnd = useCallback(() => {
        const diff = currentXRef.current - startXRef.current;

        if (Math.abs(diff) > SWIPE_THRESHOLD && hasMultiple) {
            if (diff < 0 && currentIndex < gallerySlides.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else if (diff > 0 && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
            }
        }

        setIsDragging(false);
        setDragOffset(0);
    }, [currentIndex, gallerySlides.length, hasMultiple]);

    // Touch handlers
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        handleStart(e.touches[0].clientX);
    }, [handleStart]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;
        handleMove(e.touches[0].clientX);
    }, [isDragging, handleMove]);

    const onTouchEnd = useCallback(() => {
        if (!isDragging) return;
        handleEnd();
    }, [isDragging, handleEnd]);

    // Mouse handlers
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        handleStart(e.clientX);
    }, [handleStart]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const onMouseUp = useCallback(() => {
        if (!isDragging) return;
        handleEnd();
    }, [isDragging, handleEnd]);

    const onMouseLeave = useCallback(() => {
        if (isDragging) handleEnd();
    }, [isDragging, handleEnd]);

    // Click: navigate only if user didn't swipe
    const handleClick = useCallback((e: React.MouseEvent) => {
        if (didSwipeRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        e.preventDefault();
        navigate(productLink, {
            state: { parentProductId: product.parentId, selectedColor: product.selectedColorOption, productData: product }
        });
    }, [navigate, productLink, product]);

    return (
        <div
            className="aspect-[3/4] overflow-hidden bg-gray-100 w-full h-full relative select-none group"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onClick={handleClick}
            style={{
                touchAction: hasMultiple ? 'pan-y' : 'auto',
                cursor: hasMultiple ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
            }}
        >
            {/* Slides track */}
            <div
                className="flex h-full"
                style={{
                    width: `${gallerySlides.length * 100}%`,
                    transform: `translateX(calc(-${currentIndex * (100 / gallerySlides.length)}% + ${dragOffset}px))`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                }}
            >
                {gallerySlides.map((slide, idx) => (
                    <div
                        key={`${product.parentId}-${idx}-${slide.src}`}
                        className="h-full flex-shrink-0"
                        style={{ width: `${100 / gallerySlides.length}%` }}
                    >
                        {slide.type === 'video' ? (
                            <video
                                src={slide.src}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover pointer-events-none"
                                style={{ display: 'block' }}
                            />
                        ) : (
                            <img
                                src={slide.src}
                                alt={`${product.name} ${idx + 1}`}
                                className="w-full h-full object-cover pointer-events-none"
                                style={{ display: 'block' }}
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                width="300"
                                height="400"
                                decoding="async"
                                draggable={false}
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    const current = img.src;
                                    if (/-\d+x\d+\.(jpg|jpeg|png|webp)$/i.test(current)) {
                                        img.src = current.replace(/-\d+x\d+\./, '.');
                                    } else if (/-scaled\.(jpg|jpeg|png|webp)$/i.test(current)) {
                                        img.src = current.replace(/-scaled\./, '.');
                                    } else {
                                        img.src = '/placeholder.png';
                                    }
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Left/Right Arrow Controls */}
            {hasMultiple && (
                <div className="absolute inset-0 flex items-center justify-between px-1 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        className="pointer-events-auto bg-white/70 hover:bg-white/90 rounded-full p-1 shadow-sm transition-all duration-150"
                        style={{ visibility: currentIndex > 0 ? 'visible' : 'hidden' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            didSwipeRef.current = true;
                            setCurrentIndex(prev => prev - 1);
                        }}
                        aria-label="Previous image"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button
                        className="pointer-events-auto bg-white/70 hover:bg-white/90 rounded-full p-1 shadow-sm transition-all duration-150"
                        style={{ visibility: currentIndex < gallerySlides.length - 1 ? 'visible' : 'hidden' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            didSwipeRef.current = true;
                            setCurrentIndex(prev => prev + 1);
                        }}
                        aria-label="Next image"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 6 15 12 9 18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Dot indicators */}
            {hasMultiple && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
                    {gallerySlides.map((slide, idx) => (
                        <span
                            key={idx}
                            className="block rounded-full transition-all duration-300"
                            style={{
                                width: idx === currentIndex ? 8 : 6,
                                height: idx === currentIndex ? 8 : 6,
                                backgroundColor: slide.type === 'video'
                                    ? (idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.6)')
                                    : (idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)'),
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductImageCarousel;
