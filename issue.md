# Temporary Issues

## Preserve separate printings as decklist entries

The domain model says separate printings of the same card can be separate decklist entries when set code and collector number differ.

Current code has places that merge cards by card/oracle identity, which can collapse separate printings.

Expected direction:

- preserve separate decklist entries by printing where appropriate
- keep diffing based on functional card identity and quantity
- do not let printing differences create added/removed/changed diff states

## Harden Compare Mode state isolation

Compare Mode should be a viewing state that compares two saves.

It should not disturb or replace the current decklist/editor state. Current implementation should be reviewed to ensure entering/exiting Compare Mode cannot lose or mutate current decklist state, categories, or editor history unexpectedly.
