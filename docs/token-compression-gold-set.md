#Token Compression Golden Set 21


1 — A — Java class vs instance
Sloppy draft: explain what a class is in java
Tight ask: Java class — blueprint vs one object. Not inheritance.
Core-concept summary: A class is the blueprint; an object is one thing built from that blueprint.
Next step: Write one new and name what stays on the class vs the object.
Mapping: Classroom = class. Two students = objects. Classroom still; you may add a student.
Intuition path: Same seating chart, different people — shared plan vs one instance.
Bad long pane: OOP pillars survey.
Ship-short pane: Blueprint vs one built thing. Classroom / students. Next: one new.
Failure note: “Class = object.”
Sibling: Write a Dog class and one Dog object. What is shared?
Pass looks like: Blueprint vs this dog; they do not say “class = object.”
Must not claim: A class is an object.

2 — A — Hash map
Sloppy draft: How does a hash map work?
Tight ask: Hash map — key → slot → value. Not a collision-theory course.
Core-concept summary: A hash map turns a key into a locker number and stores the value there.
Next step: Trace one key to one locker.
Mapping: Wall of lockers. Still; one door may open.
Intuition path: Ticket → locker number → thing inside.
Bad long pane: Big-O and every collision method.
Ship-short pane: Hash the key. That number is the locker. Value lives there. Collision = short list in that locker.
Failure note: “A hash map is just an array.”
Sibling: Where does "userId" go if two keys hash to locker 4?
Pass looks like: Same locker, short list — not “overwrite the map.”
Must not claim: Hash map = array with no collisions.

3 — A — Recursion call stack
Sloppy draft: explain recursion i never get the stack
Tight ask: Recursion — stack frames for one factorial-style call.
Core-concept summary: Each call pushes a frame; return pops it.
Next step: Three frames for fact(3).
Mapping: Stack of trays. Top = live call. May grow/shrink; tray shape still.
Intuition path: New tray per call; work is only the top tray.
Bad long pane: Fibonacci + trees survey.
Ship-short pane: New tray per call. Base case returns. Work is always the top tray.
Failure note: “Recursion is just a loop.”
Sibling: After fact(3) calls fact(2), which tray is live?
Pass looks like: The fact(2) tray on top; fact(3) is underneath waiting.
Must not claim: Recursion = a for-loop.

4 — A — JWT auth flow
Sloppy draft: how does jwt auth work in my api
Tight ask: JWT — signed ticket issued at login, sent on later requests. Not OAuth.
Core-concept summary: The server trusts the signature on the ticket, not a session row.
Next step: Split one token into header / payload / signature.
Mapping: Wristband at a door. Still.
Intuition path: Stamp at the desk; later the door only checks the stamp.
Bad long pane: Cookies vs tokens history.
Ship-short pane: Login stamps a ticket. Client sends it. Door checks the stamp.
Failure note: “JWT is encryption.”
Sibling: Can someone read the payload without the secret?
Pass looks like: Yes, readable; they cannot forge it without the stamp.
Must not claim: JWT encrypts the payload.

5 — A — RAG pipeline
Sloppy draft: explain rag like the pipeline
Tight ask: RAG — retrieve chunks, then generate from those chunks.
Core-concept summary: Find notes first, then write from those notes.
Next step: Name query → retrieve → generate.
Mapping: Librarian puts three books on the table; writer uses only those.
Intuition path: No book on the table → do not invent it.
Bad long pane: Embedding bake-off.
Ship-short pane: Search. Keep a few passages. Write from those.
Failure note: “RAG is just ChatGPT.”
Sibling: If retrieve returns nothing, what should generate do?
Pass looks like: Say it does not know / empty table — not a confident essay.
Must not claim: RAG trains the model.

6 — A — Heart as a pump
Sloppy draft: how does the heart work
Tight ask: Heart — two pumps, four chambers. Not every ion channel.
Core-concept summary: Right side → lungs. Left side → body.
Next step: Trace one drop through the four rooms.
Mapping: Two boxes, four rooms, two outgoing pipes. Still; one drop may be marked.
Intuition path: Two pumps in one organ; valves stop backflow.
Bad long pane: ECG / disease survey.
Ship-short pane: Right pump → lungs. Left pump → body. Next: one drop.
Failure note: “The heart oxygenates the blood.”
Sibling: Where does blood go after the right ventricle?
Pass looks like: Lungs — not “to the body.”
Must not claim: The heart adds the oxygen.

7 — A — Blood path through the heart
Sloppy draft: i get lost when they say right ventricle then lungs
Tight ask: Path of deoxygenated vs oxygenated blood through the heart only.
Core-concept summary: Blue side body→lungs; red side lungs→body.
Next step: Color two arrows only.
Mapping: Four rooms, blue right, red left. Still.
Intuition path: Do not cross sides inside the heart.
Bad long pane: Full capillary tour.
Ship-short pane: Body → right rooms → lungs → left rooms → body.
Failure note: “Left side is lungs because left is smaller.”
Sibling: Blood just left the lungs. Which chamber first?
Pass looks like: Left atrium.
Must not claim: Sides mix in the healthy heart.

8 — A — Simple electric circuit
Sloppy draft: How does a simple electric circuit work
Tight ask: Series loop — battery, wire, lamp. Not AC.
Core-concept summary: Closed loop; the lamp is where energy is spent.
Next step: Open the loop; lamp dark.
Mapping: One loop. Still; wire may break.
Intuition path: Break the path, flow stops.
Bad long pane: Faraday biography.
Ship-short pane: Battery pushes. Wire is the path. Lamp uses the energy.
Failure note: “Current is used up in the lamp.”
Sibling: One wire cut — is the lamp on?
Pass looks like: Off.
Must not claim: Current is consumed in the bulb.

9 — A — Electric charge
Sloppy draft: what even is electric charge
Tight ask: Two kinds; same-repel / opposite-attract.
Core-concept summary: Likes push apart; opposites pull together.
Next step: Two + and one +/− pair.
Mapping: Dots and push/pull arrows. Still.
Intuition path: Rubbed balloon moved charge; it did not create charge.
Bad long pane: Quark lecture.
Ship-short pane: Two signs. Same push. Opposite pull.
Failure note: “Charge is the same thing as current.”
Sibling: Two − charges near each other — push or pull?
Pass looks like: Push.
Must not claim: Charge = current.

10 — A — Electric field
Sloppy draft: i dont get electric fields
Tight ask: Field — force per charge at a point around a source.
Core-concept summary: Map of “tiny + here: which way, how hard.”
Next step: One + source, two arrows of different length.
Mapping: Weather arrows. Still.
Intuition path: Closer to the source → longer arrow.
Bad long pane: Maxwell dump.
Ship-short pane: Invisible map. Closer = longer arrow. Direction = push on a + test charge.
Failure note: “The field is the charge itself.”
Sibling: Move the test + closer — longer or shorter arrow?
Pass looks like: Longer.
Must not claim: The field is the charge.

11 — A — Gravity near Earth
Sloppy draft: explain gravity like why things fall
Tight ask: Pull toward Earth’s center; same rate if air does not matter. Not GR. Not orbits.
Core-concept summary: Earth pulls every object toward its center; near the ground they fall together without air.
Next step: Two balls dropped together.
Mapping: Earth circle, two balls, arrows to center. Still.
Intuition path: Down = toward center; air is why a feather lags.
Bad long pane: Newton bio + Einstein detour.
Ship-short pane: Toward Earth’s center. Vacuum: hammer and pebble together. Weight = that pull on this object.
Failure note: “Heavier things fall faster” as the lesson.
Sibling: Hammer and feather on the Moon — who hits first?
Pass looks like: Together (no air).
Must not claim: Heavier always hits first; this canvas is orbits.

12 — A — Gravity vs electric force
Sloppy draft: gravity and electric charge feel the same to me
Tight ask: Gravity always pulls mass; electric can pull or push charge.
Core-concept summary: Gravity one sign (attract); electric two signs.
Next step: Two masses vs two + charges.
Mapping: Two still panels.
Intuition path: Mass never repels; charge can.
Bad long pane: Unify the four forces.
Ship-short pane: Mass always attracts. Charge can attract or repel.
Failure note: “Gravity is just weak electricity.”
Sibling: Can two masses push apart by gravity alone?
Pass looks like: No.
Must not claim: Gravity has a repel mode like charge.

13 — A — Chain rule
Sloppy draft: chain rule please i always mess it up
Tight ask: Derivative of $f(g(x))$ only.
Core-concept summary: Outside change times inside change.
Next step: $\sin(x^2)$.
Mapping: Two machines in a line. Still.
Intuition path: Crank inner; outer moves after.
Bad long pane: Related-rates chapter.
Ship-short pane: $\frac{dy}{dx}=\frac{dy}{du}\cdot\frac{du}{dx}$. Outer, leave inner, times inner.
Failure note: “Differentiate everything and add.”
Sibling: Derivative of $\cos(3x)$.
Pass looks like: $-\sin(3x)\cdot 3$.
Must not claim: Add the two derivatives.

14 — A — Slope on a hill
Sloppy draft: Explain slope visually using a hill.
Tight ask: Rise over run. Not derivatives.
Core-concept summary: Slope is up per step across.
Next step: Two points on the hill.
Mapping: Hill side-view. Still.
Intuition path: One step across, this much up.
Bad long pane: All slope types.
Ship-short pane: Rise / run. Steeper = larger number.
Failure note: “Slope is the height of the hill.”
Sibling: Rise 3, run 6 — slope?
Pass looks like: $1/2$.
Must not claim: Slope = height.

15 — A — Integral as area
Sloppy draft: what is an integral using area under the curve
Tight ask: Definite integral = signed area from $a$ to $b$.
Core-concept summary: Add thin slices between curve and axis.
Next step: One slice $f(x)\,\Delta x$.
Mapping: Curve + shaded slices. Curve still.
Intuition path: Thin rectangles added up.
Bad long pane: Every integration trick.
Ship-short pane: Thin rectangles. Add them. Below axis is negative.
Failure note: Only “integral is anti-derivative,” no area.
Sibling: If the curve is below the axis, is the integral positive?
Pass looks like: Negative (signed).
Must not claim: This canvas is integration techniques.

16 — A — Photosynthesis
Sloppy draft: Explain how photosynthesis works
Tight ask: Leaf factory — light, water, CO₂ in; sugar and O₂ out.
Core-concept summary: Light + water + CO₂ → sugar + oxygen.
Next step: Four arrows labeled.
Mapping: Leaf as still factory.
Intuition path: Factory with four pipes, not “plants breathe opposite.”
Bad long pane: Full Calvin cycle.
Ship-short pane: Light, water, CO₂ in. Sugar stays. Oxygen out.
Failure note: “Plants breathe the opposite of humans” as the whole lesson.
Sibling: What leaves the leaf that animals use to breathe?
Pass looks like: Oxygen.
Must not claim: This canvas is the full Calvin pathway.

17 — B — Whole codebase
Sloppy draft: explain to me this code base + paste
Tight ask: (none)
Behavior: Ask which one canvas.
Failure note: Survey “Introduction to the codebase.”

18 — B — Any math topic
Sloppy draft: is there any math topic that you can explain
Tight ask: (none)
Behavior: Offer slope or chain rule; wait.
Failure note: Auto-picking linear functions.

19 — B — Differential equations
Sloppy draft: Can you explain differential equations
Tight ask: (none until scoped)
Behavior: What is changing, first vs second order.
Failure note: “DEs are equations with derivatives” as the canvas.

20 — B — Off-wedge ops
Sloppy draft: I am building a junk removal company and need to scale overhead
Tight ask: (none for this tutor)
Behavior: Do not invent “Managing Overhead.”
Failure note: A generated business-ops title.

21 — A — Planets orbit the sun (this comment)
Sloppy draft: why do planets orbit the sun
Tight ask: Orbit — falling sideways so you keep missing the body. Not GR. Not a college orbital-mechanics course.
Core-concept summary: An orbit is falling while moving sideways fast enough that you keep missing what you fall toward.
Next step: Four stills: cannon on a mountain, four muzzle speeds (hit nearby → farther → farther → closed path).
Mapping: Mountain + Earth curve + four still shots. Earth still. If you later draw an ellipse, the sun is at a focus, never the center.
Intuition path: Newton cannon — faster sideways, impact farther around the curve, until the curve falls away as fast as the shot falls.
Bad long pane: “Gravity and inertia magically make ellipses.” Kepler slogans.
Ship-short pane: Drop a ball: it falls in. Fire sideways: it falls while moving. Faster → farther around the curve. Fast enough, the ground curves away as fast as it falls — that path is the orbit. Next canvas: ellipse with the sun at a focus, not the center. Math of orbits is a later canvas.
Failure note: “Gravity just makes planets go around.” Sun at the center of the ellipse. “This replaces orbital mechanics.”
Sibling: Fire the cannon a bit slower than orbit speed. Where does the ball land?
Pass looks like: Hits the ground ahead, still falling in — not “it floats,” not “it instantly orbits.”
Must not claim: Sun at center of ellipse; picture = college orbital mechanics; gravity is magic glue.



So the reason its written as A and B is because we are taking two types of Specimen alright, because A is basically rewrite and run, and B is stop and ask. Purposefully included both the types because it perfectly embodies the situation we will encounter while users use the app

# These are Specimen only, do not take them as part of the Gold Set, take only the above pasted set, this is just a reference like Why A and B labeling have been given to each set.
Specimen A — rewrite and run (this is most of the 20)
Sloppy draft (what they type)

explain what a class is in java
Tight ask (Pipe A output — content name + scope only)

Content name: Java class
Scope: what a class is vs one object created from it. Not inheritance, not interfaces, not a whole OOP course.

Core-concept summary (one sentence)

A class is the blueprint; an object is one thing built from that blueprint.
Next step

Create one object from that class and say what is shared vs what is per-object.
Mapping on this canvas

Objects on the board: one classroom (blueprint), two seated students (instances).
Meaning: classroom = class; each student = object.
Still / may move: classroom stays frozen. You may add a second student as a transition. Do not play a video of “the class running.”

Bad long pane (current dump — landfill)

“In object-oriented programming it is important to note that a class is a fundamental construct. Classes allow developers to model real-world entities. There are many pillars of OOP including encapsulation, inheritance, and polymorphism. A class can have fields and methods. For example in the real world everything is an object…”

(This is the thing Pipe B must kill.)
Ship-short pane (what you would put on the right and speak)

A class is the blueprint. An object is one thing built from it.

On this canvas the classroom is the class. Each student is an object.

Same seating chart, different people.

Next: write one new from that class and name what stays on the classroom vs what sits on the student.
Failure note (how a shorter version would be wrong)

“Class = object. Classroom = Java.” — short, fluent, wrong.

Or: “OOP has four pillars.” — shorter, true, not this canvas.
That last line is why length is not the score.

Specimen B — stop and ask (you need a few of these in the 20, not all 20)
Sloppy draft

explain to me this code base + a paste, or is there any math topic you can explain
Tight ask

Cannot name one content + one scope.
Product behavior

Do not run. Show two options or ask: “Which one canvas — the ReadableStream constructor, or how chunks are pulled?”
Failure note

If you invent “Introduction to codebases” and compress it, you have a shorter generalist. That is a fail even if the English is clean.


This document is basically the blueprint, for our compression

Off-gold (asks not on this sheet's ship-shorts): see `docs/token-compression-off-gold.md`.
