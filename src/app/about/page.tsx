import type { Metadata } from "next";
import { COMPANY } from "@/lib/crew";

export const metadata: Metadata = { title: "How this demo works" };

export default function About() {
  const h2 = "mt-10 text-2xl font-bold";
  const p = "mt-3 leading-relaxed";
  const link = "font-semibold text-ink underline underline-offset-4";
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-4xl lg:text-5xl">How this demo works</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        This is a demonstration build by ChopMedia. It is not client work, and nothing in it is real: {COMPANY.name} is a fictional company, {COMPANY.town} is an invented town, and every
        customer, technician, address, phone number and message was made up for the demo.
      </p>

      <h2 className={h2}>What it shows</h2>
      <p className={p}>
        A service company&apos;s day never goes to plan. Requests arrive as rambling messages, one job runs long, an emergency lands in the middle, and the dispatcher has to decide who goes
        where while customers wait to hear. This demo follows one such day from three sides: the customer who asks for a visit, the dispatcher who runs the board, and the technician with a
        phone. All three look at the same day, so what one does shows up for the others.
      </p>

      <h2 className={h2}>Recorded: the AI reading</h2>
      <p className={p}>
        Each sample customer message was given to Claude, an AI model made by Anthropic, with a fixed set of instructions. What it wrote was saved: a summary, the kind of job, how urgent it
        sounds, anything about access, questions worth asking, and the exact words it relied on. The demo replays those saved readings and marks the quoted words in the message. They were
        not tidied up by hand. The demo does not call an AI model while you use it, which is why it runs with no key and at no cost.
      </p>
      <p className={p}>
        Nothing you type is read by AI. The customer&apos;s request form is made of choices for that reason, so the demo never pretends to understand words it has not seen.
      </p>

      <h2 className={h2}>Written rules: who to send and how to repair the day</h2>
      <p className={p}>
        The AI describes a message. It never decides anything. Who can do a job, who can get there soonest, whose other customers would be kept waiting, and what to move when the day slips
        are all worked out by ordinary written rules, and each suggestion comes with its reasons. The dispatcher can always choose someone else.
      </p>
      <p className={p}>
        The reshuffle is a simple repair: it makes one move at a time, each the one that helps most, and stops when nobody is late or nothing more helps. It is not a route optimiser and does
        not claim to find the best possible day. Lunch breaks, parts runs and traffic are not modelled.
      </p>
      <p className={p}>
        One rule sits above the rest. A message that mentions a smell of gas is held and cannot be booked. The customer is told to leave the house and call the gas company or 911.
      </p>

      <h2 className={h2}>Scripted: the day itself</h2>
      <p className={p}>
        The demo has its own clock, starting at 9:30 AM. <em>Skip ahead 30 minutes</em> moves it on, and the crew carries on with the plan. Which messages arrive when, and which job runs long,
        is fixed in advance. The map is a drawing of the invented town, and drive times are counted in blocks on that drawing. A real build takes them from a mapping service.
      </p>

      <h2 className={h2}>Texts are never sent</h2>
      <p className={p}>
        Booking a visit, a technician setting off, and a change of arrival time each write a text to the customer. In the demo they go to an outbox you can read, and nowhere else.
      </p>

      <h2 className={h2}>What it is not</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>It does not track real vans, send real texts, take payments or keep stock of parts.</li>
        <li>It is not safety advice beyond the one rule about gas, and it is no substitute for calling 911 in an emergency.</li>
        <li>It is not a measure of accuracy. A handful of invented messages says nothing about how a model reads a real company&apos;s customers. A real project starts by testing it on yours.</li>
      </ul>

      <h2 className={h2}>Your copy</h2>
      <p className={p}>
        Each visitor gets a private copy of the sample day, so what you do here is seen by nobody else. One cookie remembers which copy is yours. It holds a random id and nothing about you,
        and the copy is deleted after two days. <em>Reset demo</em> puts the day back to 9:30 AM.
      </p>

      <p className="mt-10 border-t border-line pt-6 leading-relaxed">
        Built by ChopMedia. Contact Hayden Huelskamp at{" "}
        <a href="mailto:chopscales@gmail.com" className={link}>
          chopscales@gmail.com
        </a>
        , or on{" "}
        <a href="https://www.linkedin.com/in/hayden-huelskamp-547a86302/" className={link}>
          LinkedIn
        </a>
        .
      </p>
    </main>
  );
}
