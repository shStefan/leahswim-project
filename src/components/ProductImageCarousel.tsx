import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface CarouselProduct {
    parentId: number;
    variationId?: number;
    name: string;
    imageSrc: string;
    selectedColorOption: string;
    originalImages?: Array<{ src: string }>;
    isVideo?: boolean;
    // pass-through for navigation state
    [key: string]: any;
}

interface ProductImageCarouselProps {
    product: CarouselProduct;
    productLink: string;
}

const ProductImageCarousel = ({ product, productLink }: ProductImageCarouselProps) => {
    const navigate = useNavigate();

    console.log(`🔵🔵🔵 [CAROUSEL RENDER] Product ${product.parentId} "${product.name}" | imageSrc: ${product.imageSrc?.substring(0, 50)}... | originalImages: ${product.originalImages?.length || 0}`);

    // Convert full-size WooCommerce URL to a smaller thumbnail for catalogue cards
    // e.g., ...hash-scaled.jpg → ...hash-768x768.jpg  or  ...hash.jpg → ...hash-768x768.jpg
    const toThumbnail = useCallback((src: string, size = '768x768'): string => {
        if (!src || src === '/placeholder.png') return src;
        // Already a thumbnail?
        if (/-\d+x\d+\.(jpg|jpeg|png|webp)$/i.test(src)) return src;
        // -scaled.jpg → -SIZExSIZE.jpg
        if (/-scaled\.(jpg|jpeg|png|webp)$/i.test(src)) {
            return src.replace(/-scaled\./, `-${size}.`);
        }
        // original.jpg → original-SIZExSIZE.jpg
        return src.replace(/\.(jpg|jpeg|png|webp)$/i, `-${size}.$1`);
    }, []);

    // Build gallery: variation image first, then fill from originalImages (up to 3 total)
    const galleryImages = useMemo(() => {
        const images: string[] = [];

        // Start with the main variation/product image
        if (product.imageSrc && product.imageSrc !== '/placeholder.png') {
            images.push(toThumbnail(product.imageSrc));
        }

        // Add additional images from the parent product gallery
        const origCount = product.originalImages?.length || 0;
        let addedFromGallery = 0;
        if (product.originalImages && product.originalImages.length > 0) {
            for (const img of product.originalImages) {
                const thumbSrc = toThumbnail(img.src);
                if (img.src && thumbSrc !== images[0] && img.src !== product.imageSrc && images.length < 3) {
                    images.push(thumbSrc);
                    addedFromGallery++;
                }
            }
        }

        const result = images.length > 0 ? images : ['/placeholder.png'];

        // ONE-LINE summary log for each product
        if (result.length > 1) {
            console.log(`✅ [Carousel] Product ${product.parentId} "${product.name}" → ${result.length} images (swipeable! 🖐️). Parent gallery: ${origCount} imgs, added ${addedFromGallery} extra.`);
        } else {
            console.log(`⚠️ [Carousel] Product ${product.parentId} "${product.name}" → ONLY 1 image (no swipe). Parent gallery has ${origCount} image(s), none different from main.`);
        }

        return result;
    }, [product.imageSrc, product.originalImages, product.parentId, product.name, toThumbnail]);

    const hasMultiple = galleryImages.length > 1;
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
        console.log(`👆 [Carousel] Drag START at x=${clientX}, product=${product.parentId}, hasMultiple=${hasMultiple}`);
    }, [product.parentId, hasMultiple]);

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

        console.log(`👆 [Carousel] Drag END: diff=${diff}px, threshold=${SWIPE_THRESHOLD}, hasMultiple=${hasMultiple}, currentIndex=${currentIndex}, maxIndex=${galleryImages.length - 1}`);

        if (Math.abs(diff) > SWIPE_THRESHOLD && hasMultiple) {
            if (diff < 0 && currentIndex < galleryImages.length - 1) {
                const newIdx = currentIndex + 1;
                console.log(`➡️ [Carousel] Swiping to NEXT image: ${currentIndex} → ${newIdx}`);
                setCurrentIndex(newIdx);
            } else if (diff > 0 && currentIndex > 0) {
                const newIdx = currentIndex - 1;
                console.log(`⬅️ [Carousel] Swiping to PREV image: ${currentIndex} → ${newIdx}`);
                setCurrentIndex(newIdx);
            } else {
                console.log(`🚫 [Carousel] Swipe blocked - at boundary (index=${currentIndex}, max=${galleryImages.length - 1})`);
            }
        } else if (Math.abs(diff) <= SWIPE_THRESHOLD) {
            console.log(`🔘 [Carousel] Drag too short (${Math.abs(diff)}px < ${SWIPE_THRESHOLD}px), treating as tap`);
        }

        setIsDragging(false);
        setDragOffset(0);
    }, [currentIndex, galleryImages.length, hasMultiple]);

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
        if (e.button !== 0) return; // left click only
        handleStart(e.clientX);
    }, [handleStart]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault(); // prevent text selection during drag
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const onMouseUp = useCallback(() => {
        if (!isDragging) return;
        handleEnd();
    }, [isDragging, handleEnd]);

    const onMouseLeave = useCallback(() => {
        if (isDragging) {
            handleEnd();
        }
    }, [isDragging, handleEnd]);

    // Click: navigate only if user didn't swipe
    const handleClick = useCallback((e: React.MouseEvent) => {
        if (didSwipeRef.current) {
            console.log(`🚫 [Carousel] Click suppressed (user swiped)`);
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        console.log(`🔗 [Carousel] Navigating to ${productLink}`);
        e.preventDefault();
        navigate(productLink, {
            state: { parentProductId: product.parentId, selectedColor: product.selectedColorOption, productData: product }
        });
    }, [navigate, productLink, product]);

    // Determine if the first image is a video
    const isFirstVideo = product.isVideo && galleryImages[0]?.match?.(/\.(mp4|webm)$/i);

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
            {/* Images track */}
            <div
                className="flex h-full"
                style={{
                    width: `${galleryImages.length * 100}%`,
                    transform: `translateX(calc(-${currentIndex * (100 / galleryImages.length)}% + ${dragOffset}px))`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                }}
            >
                {galleryImages.map((src, idx) => {
                    const isVideo = idx === 0 && isFirstVideo;
                    return (
                        <div
                            key={`${product.parentId}-${idx}-${src}`}
                            className="h-full flex-shrink-0"
                            style={{ width: `${100 / galleryImages.length}%` }}
                        >
                            {isVideo ? (
                                <video
                                    src={src}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover pointer-events-none"
                                    style={{ display: 'block' }}
                                />
                            ) : (
                                <img
                                    src={src}
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
                                        // If thumbnail failed, try the full-size (-scaled or original)
                                        const current = img.src;
                                        if (/-\d+x\d+\.(jpg|jpeg|png|webp)$/i.test(current)) {
                                            const fullSrc = current.replace(/-\d+x\d+\./, '-scaled.');
                                            img.src = fullSrc;
                                        } else {
                                            img.src = '/placeholder.png';
                                        }
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
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
                        style={{ visibility: currentIndex < galleryImages.length - 1 ? 'visible' : 'hidden' }}
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
                    {galleryImages.map((_, idx) => (
                        <span
                            key={idx}
                            className="block rounded-full transition-all duration-300"
                            style={{
                                width: idx === currentIndex ? 8 : 6,
                                height: idx === currentIndex ? 8 : 6,
                                backgroundColor: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
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
