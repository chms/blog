---
title: 'A Family Data Plan: Data Classification'
pubDate: 'Nov 05 2026'
tags: ['DIY', 'Technology']
---

Before we talk about how to store and back up data, we need to talk about what data we have and how to classify it. Two dimensions matter:

1. **Sensitivity** – How confidential is the data? What's the impact if it gets stolen or seen by the wrong person?
2. **Recoverability** – Can the data be recovered from somewhere else? What's the impact if it gets deleted?

Who may see the data is a third question, but it mostly follows from the first: the more sensitive the data, the fewer people should see it.

:mdi-shield-lock=12:

Combining these, we get five tiers:

- **T1: Secret** – Leaking it would hurt us badly. Passwords, recovery codes, keys, ID documents, medical records. Some of it can be replaced with effort (a passport can be reissued); some of it can't (a lost recovery code may lock us out for good).
- **T2: Private** – Confidential and irreplaceable, belonging to one person. Diaries, personal projects, the planning files for that surprise party.
- **T3: Shared** – Confidential and irreplaceable, belonging to the whole family. Family photos, joint projects, household paperwork.
- **T4: Replaceable** – Internal, but recoverable. The digitized media collection: if it's lost, I can rip the DVDs again.
- **T5: Public** – Meant to be seen by anyone, like this blog post. Not confidential, but not necessarily replaceable: if the only copy sits on the web server, it needs a backup too.

More on how to handle each tier in practice later.