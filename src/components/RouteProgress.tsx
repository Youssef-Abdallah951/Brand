import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Ultra-thin indeterminate progress bar pinned to the top of the viewport.
 * Runs briefly on every location change (en + rtl friendly: fill grows from start).
 */
export function RouteProgress(): React.ReactElement | null {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const prev = useRef(location.pathname);

  useEffect(() => {
    if (prev.current === location.pathname) return;
    prev.current = location.pathname;
    setActive(true);
    const t1 = window.setTimeout(() => setActive(false), 700);
    return () => window.clearTimeout(t1);
  }, [location.pathname]);

  if (!active) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[70] pointer-events-none" aria-hidden="true">
      <div className="h-[3px] route-progress bg-bronze dark:bg-[#c9a06a]" />
    </div>
  );
}
