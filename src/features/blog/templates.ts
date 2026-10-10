// Starter templates. Picking one fills the title, category and a ready-made
// outline so writers never face a blank page.
export interface Template {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  category: string;
  tags: string[];
  title: string;
  body: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'ctf',
    name: 'CTF write-up',
    emoji: '🚩',
    blurb: 'Walk through a challenge you solved, step by step.',
    category: 'CTF Writeups',
    tags: ['CTF', 'Writeup'],
    title: '',
    body: `## The challenge

What was the challenge, which event, and what category? Drop the prompt here.

## First look

What did you notice when you opened it? Paste a screenshot — just drag it in.

## Finding the way in

Walk through what you tried. Show the commands and what they returned:

\`\`\`bash
# the command you ran
\`\`\`

## The flag

How it all came together, and the flag format.

## What I learned

One or two things worth remembering for next time.`,
  },
  {
    id: 'scam',
    name: 'Scam alert',
    emoji: '⚠️',
    blurb: 'Warn people about a scam and how to stay safe.',
    category: 'Scam Alert',
    tags: ['Scam', 'Awareness'],
    title: '',
    body: `## What's going around

Describe the scam in one or two lines so anyone gets it fast.

## How it works

1. First, the scammer does this…
2. Then they ask for…
3. And that's how people lose money or access.

## Red flags

- Something that should make you stop
- Another warning sign
- One more

## If it happens to you

What to do right away, and where to report it.`,
  },
  {
    id: 'tutorial',
    name: 'Tutorial',
    emoji: '🛠️',
    blurb: 'Teach a tool or technique from start to finish.',
    category: 'Tutorials',
    tags: ['Tutorial', 'Guide'],
    title: '',
    body: `## What you'll build

A line on what the reader will have by the end.

## Before you start

- What they need installed or ready

## Step 1 — …

Explain it, then show it:

\`\`\`bash
# commands go here
\`\`\`

## Step 2 — …

Keep steps short. Add a screenshot where it helps.

## Wrapping up

A quick recap and where to go next.`,
  },
  {
    id: 'blank',
    name: 'Blank page',
    emoji: '✍️',
    blurb: 'Start fresh with just a few prompts.',
    category: '',
    tags: [],
    title: '',
    body: '',
  },
];
