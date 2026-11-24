"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The tour: a short walk through the dispatcher's morning, driven by the
 * app's own controls. Nothing is recorded and nothing is faked; the tour
 * finds things on the page by a `data-tour` marker and presses them as a
 * visitor would. The screen dims around the one thing being shown, and each
 * step is given time to be read.
 */

const CAPTIONS = [
  "The dispatcher starts the day here: only what needs a person, as one short list.",
  "Open a customer's message.",
  "AI read the message and marked the words it relied on. The readings were recorded for this demo.",
  "Who to send is worked out by written rules, not AI. Each name comes with its reasons, and the dispatcher chooses.",
  "Now the day moves on. Skip ahead until a job runs long.",
  "A customer would be kept waiting, so it goes to the top of the list.",
  "The rules propose a reshuffle and say who would still be late. Nothing moves until the dispatcher accepts.",
  "Accepting queues a text to each customer. No text is sent in this demo. That is the tour.",
];

/** Stretches every pause in the tour. Above 1 is slower. */
const PACE = 1.5;
/** How long the tour waits for the app to show the next thing before it gives up. */
const PATIENCE_MS = 20_000;
/** The lit area reaches this far past the thing it shows. */
const MARGIN = 10;
/** Room kept clear at the foot of the window for the caption. */
const CAPTION_ROOM = 170;
/** The most half hours the tour will skip while it waits for a job to run long. */
const MOST_SKIPS = 4;

class Stopped extends Error {}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const find = (marker: string) => document.querySelector<HTMLElement>(`[data-tour="${marker}"]`);
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const centre = (element: HTMLElement): [number, number] => {
  const rect = element.getBoundingClientRect();
  return [rect.left + Math.min(rect.width / 2, 180), rect.top + rect.height / 2];
};

export function TourButton({ className }: { className: string }) {
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [halted, setHalted] = useState(false);

  // Refs hold what the tour needs between awaits, where state would be stale.
  const run = useRef(0);
  const lit = useRef<HTMLElement | null>(null);
  const held = useRef<HTMLElement | null>(null);
  const gliding = useRef(false);
  const at = useRef<[number, number]>([0, 0]);
  const spot = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLDivElement>(null);
  const stopButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);

  const running = step !== null;

  const stop = useCallback(() => {
    run.current += 1;
    lit.current = held.current = null;
    setStep(null);
    setHalted(false);
    setTimeout(() => startButton.current?.focus({ preventScroll: true }));
  }, []);

  // The light and the pointer follow what they are on, frame by frame, so they keep up while the page scrolls.
  useEffect(() => {
    if (!running) return;
    const still = calm();
    let box: number[] | null = null;
    let frame = 0;
    const place = (x: number, y: number) => {
      at.current = [x, y];
      if (pointer.current) pointer.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    place(window.innerWidth / 2, window.innerHeight / 2);
    const follow = () => {
      frame = requestAnimationFrame(follow);
      if (!gliding.current && held.current?.isConnected) place(...centre(held.current));
      // The pointer is only there while it is going to something or on it.
      if (pointer.current) pointer.current.style.opacity = held.current ? "1" : "0";
      // With nothing picked out, as on a page that has just opened, the whole window is lit.
      const rect = lit.current?.isConnected ? lit.current.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      const want = [rect.left - MARGIN, rect.top - MARGIN, rect.width + 2 * MARGIN, rect.height + 2 * MARGIN];
      box = box && !still ? box.map((value, index) => value + (want[index] - value) * 0.14) : want;
      if (!spot.current) return;
      spot.current.style.transform = `translate(${box[0]}px, ${box[1]}px)`;
      spot.current.style.width = `${box[2]}px`;
      spot.current.style.height = `${box[3]}px`;
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    stopButton.current?.focus({ preventScroll: true });
    // The caption sits over the foot of the page, so the page grows by its height and nothing is left underneath it.
    document.body.style.paddingBottom = "13rem";
    // While the tour runs, ending it is the only control: Escape presses it and Tab stays on it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop();
      else if (event.key === "Tab") {
        event.preventDefault();
        stopButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.paddingBottom = "";
      document.removeEventListener("keydown", onKey, true);
    };
  }, [running, stop]);

  async function start() {
    if (running) return;
    const generation = ++run.current;
    const check = () => {
      if (run.current !== generation) throw new Stopped();
    };
    const pause = async (ms: number) => {
      await wait(ms * PACE);
      check();
    };
    const until = async <T,>(look: () => T | null | undefined | false): Promise<T> => {
      const deadline = Date.now() + PATIENCE_MS;
      for (;;) {
        check();
        const found = look();
        if (found) return found;
        if (Date.now() > deadline) throw new Error("The app did not show the next step.");
        await wait(100);
      }
    };
    /** Lights one thing and brings it clear of the caption. */
    const light = (target: HTMLElement) => {
      lit.current = target;
      const rect = target.getBoundingClientRect();
      const room = window.innerHeight - CAPTION_ROOM;
      const by = rect.height > room - 32 ? rect.top - 16 : rect.top - (room - rect.height) / 2;
      window.scrollBy({ top: by, behavior: calm() ? "auto" : "smooth" });
    };
    /** Walks the pointer to a thing, leaves time to read, then shows the press. The caller does the real press. */
    const reach = async (target: HTMLElement, readFor: number) => {
      await pause(600);
      const [fromX, fromY] = at.current;
      const duration = calm() ? 0 : Math.min(1400, 600 + Math.hypot(centre(target)[0] - fromX, centre(target)[1] - fromY) * 0.7);
      const began = performance.now();
      gliding.current = true;
      held.current = target;
      while (duration > 0 && performance.now() - began < duration) {
        const t = (performance.now() - began) / duration;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        // Aimed afresh every frame, because the page may still be scrolling under the pointer.
        const [toX, toY] = centre(target);
        at.current = [fromX + (toX - fromX) * eased, fromY + (toY - fromY) * eased];
        if (pointer.current) pointer.current.style.transform = `translate(${at.current[0]}px, ${at.current[1]}px)`;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (run.current !== generation) break;
      }
      gliding.current = false;
      check();
      await pause(readFor);
      pointer.current?.classList.add("tour-tap");
      await wait(420);
      pointer.current?.classList.remove("tour-tap");
      check();
    };
    const home = async () => {
      if (window.location.pathname !== "/") router.push("/");
      const list = await until(() => window.location.pathname === "/" && find("list"));
      window.scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" });
      return list;
    };

    try {
      setHalted(false);
      setStep(0);
      const list = await home();
      await pause(1200);
      light(list);
      await pause(5200);

      // The tour reads a message, so it needs one that is still waiting to be read.
      const row = find("row");
      if (!row) throw new Error("No customer's message is waiting.");
      setStep(1);
      light(row);
      await reach(row, 1400);
      row.click();
      const reading = await until(() => window.location.pathname.startsWith("/jobs/") && find("reading"));
      lit.current = held.current = null;
      // A beat with the whole new page lit, before the light narrows onto one part of it.
      await pause(1400);

      setStep(2);
      light(reading);
      await pause(5600);
      // The questions to ask and the reading's notes are folded away; the tour opens them.
      const asks = find("asks") as HTMLDetailsElement | null;
      const fold = asks?.querySelector("summary");
      if (asks && fold && !asks.open) {
        await reach(fold, 600);
        fold.click();
        held.current = null;
        await pause(300);
        light(reading);
        await pause(5200);
      }

      setStep(3);
      light(await until(() => find("send")));
      await pause(7200);

      setStep(4);
      lit.current = null;
      await home();
      await pause(1000);
      for (let skips = 0; !find("decision"); skips += 1) {
        const skip = find("skip") as HTMLButtonElement | null;
        if (!skip || skips === MOST_SKIPS) throw new Error("No job ran long.");
        const clock = find("clock")?.textContent;
        light(skip);
        await reach(skip, skips === 0 ? 1600 : 500);
        skip.click();
        await until(() => find("clock")?.textContent !== clock && !(find("skip") as HTMLButtonElement | null)?.disabled);
        await pause(1500);
      }

      setStep(5);
      const decision = find("decision")!;
      light(decision);
      await reach(decision, 3200);
      decision.click();
      const proposal = await until(() => window.location.pathname === "/reshuffle" && find("reshuffle"));
      lit.current = held.current = null;
      await pause(1400);

      setStep(6);
      light(proposal);
      await pause(8000);

      setStep(7);
      light(await until(() => find("accept")));
      await pause(6400);
      if (run.current === generation) stop();
    } catch (problem) {
      if (problem instanceof Stopped || run.current !== generation) return;
      lit.current = held.current = null;
      setHalted(true);
    }
  }

  return (
    <>
      <button ref={startButton} type="button" onClick={() => void start()} disabled={running} className={className}>
        Tour
      </button>
      {running && (
        <>
          {/* Holds the mouse, so a stray click cannot send the app somewhere the tour is not. */}
          <div aria-hidden className="fixed inset-0 z-[60]" />
          <div aria-hidden ref={spot} className="tour-spot" />
          <div aria-hidden ref={pointer} className="tour-pointer" />
          <section aria-label="The tour" className="fixed inset-x-3 bottom-3 z-[62] mx-auto flex max-w-[44rem] items-center gap-4 rounded-2xl border border-white/20 bg-ink px-5 py-4 text-base font-normal text-white shadow-[0_12px_40px_-8px_rgb(10_13_34/0.7)] sm:bottom-5">
            <div aria-live="polite" role={halted ? "alert" : undefined} className="min-w-0 flex-1">
              <p className="text-[0.9375rem] text-white/70">{halted ? "Demonstration build. The tour stopped" : `Demonstration build. Step ${step + 1} of ${CAPTIONS.length}`}</p>
              <p className="mt-0.5 text-[1.0625rem] font-semibold leading-snug text-white">
                {halted ? "The page did not show the next step. Reset the demo and take the tour again, or carry on by hand." : CAPTIONS[step]}
              </p>
            </div>
            <button ref={stopButton} type="button" onClick={stop} className="inline-flex min-h-11 flex-none cursor-pointer items-center rounded-full border-[1.5px] border-white px-4 font-semibold text-white hover:bg-white/15">
              {halted ? "Close" : "End tour"}
            </button>
          </section>
        </>
      )}
    </>
  );
}
