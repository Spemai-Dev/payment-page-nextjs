'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { CheckoutItem } from '@/lib/types';
import SafeImage from './SafeImage';

type ItemPreviewModalProps = {
  item: CheckoutItem | null;
  onClose: () => void;
};

export default function ItemPreviewModal({ item, onClose }: ItemPreviewModalProps) {
  const images = item?.images?.length ? item.images : item?.image ? [item.image] : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [item?.id]);

  if (!item) return null;

  const hasGallery = images.length > 1;
  const current = images[activeIndex] || images[0] || null;

  function showPrev() {
    setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  }

  function showNext() {
    setActiveIndex((index) => (index === images.length - 1 ? 0 : index + 1));
  }

  return (
    <dialog className="pp-modal" open onCancel={onClose} aria-labelledby="item-preview-title">
      <div className="pp-modal__card pp-item-preview-card">
        <div className="pp-item-preview-card__head">
          <h2 id="item-preview-title">{item.name}</h2>
          <button type="button" className="pp-item-preview-card__close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="pp-item-preview-card__stage">
          {hasGallery ? (
            <button type="button" className="pp-item-preview-card__nav" onClick={showPrev} aria-label="Previous image">
              <ChevronLeft size={18} />
            </button>
          ) : null}

          <div className={`pp-item-preview-card__media ${current ? 'has-image' : ''}`}>
            {current ? (
              <SafeImage src={current} alt="" />
            ) : (
              <>
                <ImageIcon size={28} />
                <span>No image uploaded</span>
              </>
            )}
          </div>

          {hasGallery ? (
            <button type="button" className="pp-item-preview-card__nav" onClick={showNext} aria-label="Next image">
              <ChevronRight size={18} />
            </button>
          ) : null}
        </div>

        {hasGallery ? (
          <>
            <p className="pp-item-preview-card__count">{activeIndex + 1} of {images.length}</p>
            <div className="pp-item-preview-card__thumbs">
              {images.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  type="button"
                  className={idx === activeIndex ? 'is-active' : undefined}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Show image ${idx + 1}`}
                >
                  <SafeImage src={src} alt="" />
                </button>
              ))}
            </div>
          </>
        ) : null}

        <p className="pp-item-preview-card__copy">{item.description || 'No description provided.'}</p>
        <div className="pp-item-preview-card__price">
          {item.discountAmount > 0 ? <s>{formatMoney(item.currency, item.grossAmount)}</s> : null}
          <strong>{formatMoney(item.currency, item.netAmount)}</strong>
        </div>
      </div>
    </dialog>
  );
}
