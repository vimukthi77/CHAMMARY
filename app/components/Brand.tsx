'use client';

/**
 * Brand lockup: the uploaded logo (public/next.png) beside the Chammery name.
 * `textClass` lets each header keep its own color/size for the wordmark.
 */
export default function Brand({
  text = 'Chammery',
  textClass = 'font-bold text-base',
  logoClass = 'h-8 w-8',
}: {
  text?: string;
  textClass?: string;
  logoClass?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/next.png" alt="Chammery logo" className={`${logoClass} object-contain rounded-lg`} />
      <span className={textClass}>{text}</span>
    </span>
  );
}
