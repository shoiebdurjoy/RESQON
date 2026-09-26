import { useEffect, useRef, useState } from 'react';

export function useCountUp(target, duration = 750) {
  const [count, setCount] = useState(0);
  const raf   = useRef(null);
  const prev  = useRef(0);

  useEffect(() => {
    const end = Number(target);
    if (target == null || isNaN(end)) return;

    const start = prev.current;
    prev.current = end;
    if (start === end) { setCount(end); return; }

    const t0 = performance.now();
    function frame(t) {
      const elapsed  = t - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(start + (end - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(frame);
    }

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return count;
}