---
status: accepted
date: 2026-05-11
---

# 0003 — Pattern set

## Context

Polyrhythm pedagogy lives or dies by which subdivisions you pick. Too many and the listener can't tell them apart; too few and the experience is boring.

## Decision

Five subdivisions, picked to span "easy" → "your brain breaks":

| ID              | Subdivisions / bar (4/4) | Why                                                   |
| --------------- | ------------------------ | ----------------------------------------------------- |
| `quarter`       | 4                        | the pulse — anchor for everything else                |
| `eighth`        | 8                        | 2:1 against quarter, easy entry                       |
| `triplet`       | 6                        | 3:2 against quarter, the classic "swing in your head" |
| `dotted-eighth` | 16/3                     | clave / Afro-Cuban pulse, 3:8 against quarter         |
| `fives`         | 5                        | 5:4 against quarter, the genuinely hard one           |

A 4-person session is meant to assign quarter + eighth + triplet + fives. The dotted-eighth is provided for fans of cross-rhythmic 3:16.

## Consequences

- Five voices is more than four phones, but that's fine — each phone picks its own.
- Every pattern uses a distinct sine-square click pitch so listeners can tell them apart by ear even when their phones are out of sight.
- The `metro-bar` UI shows `subdivisionsPerBar` cells lit in sequence per the local phone's pattern, so the player can see their own beat too.

## Alternatives considered

- **Free-text "subdivisions per bar"**. Rejected — too easy to set absurd values like 47 and confuse the room.
- **Time-signatures other than 4/4**. Rejected for v1 — the polyrhythms above already cover the interesting cases. 7/8 or 5/4 could come in v2.
