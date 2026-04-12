# Glossary

## Folder
A named container for related deck lists and comparisons.

## Workspace
An older planning term for the top-level container. The UI should use Folder unless there is a clear reason to rename it later.

## Deck List
A single uploaded or pasted MTG deck list as raw text.

## Deck Entry
One parsed line from a deck list, usually a quantity plus a card name such as `4 Lightning Bolt`.

## Card Category
The high-level bucket used to organize cards in the UI, such as Land, Creature, Artifact, Instant, or Sorcery.

## Comparison
A side-by-side view of two deck lists after parsing, validation, and category grouping.

## Diff Block
One category-specific split diff section, such as the Creature diff or Land diff.

## Validation
The step where parsed card names are checked against Scryfall and resolved to canonical card data.

## Canonical Card
The normalized card record returned from Scryfall that the app uses for display and comparison.

## Staging List
A working output list built by selecting cards from comparisons. This is planned, but not part of the first diff-only slice.
