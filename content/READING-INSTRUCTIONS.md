# How the recorded readings were made

`src/data/messages.json` holds six invented messages of the kind a plumbing company's office receives:
texts, a website form, a transcribed voicemail. An AI model was given the instructions below and each
message, and what it wrote was saved to `src/data/readings/<key>.json`. The app replays those files.
They are not edited by hand: if a message changes, it is read again.

The model is given only the channel and the text of the message. It is not told who the customer is,
what the day's schedule looks like, or who is available. Deciding who to send is done by written rules
in `src/lib/suggest.ts`, not by the model.

## Instructions given to the model

You are reading a message a customer sent to a residential plumbing and drain company. A dispatcher
will use your reading to decide what kind of job it is and how soon someone must go. Read only the
message. Do not guess at anything it does not say: record it as unclear or unstated, and put the
question the dispatcher should ask in `ask_first`.

Write one JSON file per message, in this shape:

```json
{
  "summary": "One plain sentence saying what the customer needs.",
  "job_type": { "value": "drain", "quote": "..." },
  "urgency": { "value": "today", "quote": "...", "why": "..." },
  "safety": { "hazard": "gas_smell", "what": "...", "quote": "..." },
  "access": [{ "text": "...", "quote": "..." }],
  "ask_first": ["..."],
  "notes": ["..."]
}
```

- Every `quote` is copied character for character from the message, as one unbroken run of words,
  at most about 20 words, and it should be the words that support the item. Keep the customer's
  spelling and capitals exactly, mistakes included.
- `job_type.value` is one of:
  - `leak`: water escaping from a pipe, valve, ceiling, wall or floor
  - `fixture`: a toilet, tap, spigot or other fixture that needs repair or replacing
  - `drain`: a sink, tub, shower or floor drain that is blocked or slow
  - `water_heater`: a problem with a water heater or with hot water
  - `sewer`: the main sewer line, or several drains backing up at once
  - `unclear`: the message does not say enough to choose. Then `quote` is the words that describe
    the problem, and `ask_first` has the question that would settle it.
- `urgency.value` is one of:
  - `emergency`: water is escaping now and cannot be stopped, or there is a risk to people or the
    building
  - `today`: the customer asks for today, or is without something they need (no hot water, no
    working toilet, no usable kitchen sink)
  - `flexible`: the customer says it can wait
  - `unstated`: the message does not say and the problem does not make it plain. Then `quote` is null.
  `why` is one short plain sentence giving your reason.
- `safety` is null unless the message describes something that could hurt someone. `hazard` is
  `gas_smell` for any smell of gas or rotten eggs, whatever else the message asks for, and `other`
  for anything else (say what in `what`, in a few plain words). Do not tell the customer or the
  dispatcher what to do about it: the company has its own rules for that.
- `access` is anything the technician needs to know to get in or to be safe on arrival: which door,
  a dog, call first, when someone is home. Empty if the message has none.
- `ask_first` is the questions the dispatcher should ask the customer before sending someone, the
  most useful first, at most four. Ask only what the message leaves open and what would change who
  is sent, what they bring, or how soon. Write each as the question itself, in words the dispatcher
  can read out. Empty if nothing needs asking.
- `notes` is for anything a careful dispatcher should know that fits nowhere else, at most three,
  in plain words, with no mention of field names or this format. Empty if there is nothing.
