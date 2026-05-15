# DeckDiff Web Context

DeckDiff Web is the deck editing surface for importing, editing, comparing, saving, and exporting Magic decklists.

## Language

**Deck Workspace**:
The saved editing surface for a deck, including its current decklist, save history, and display organization.

**Deck Tile**:
The clickable deck summary shown in the deck list.

**Deck Tile Cover**:
The printing selected to visually represent a deck tile.

**Decklist**:
A list of decklist entries.

**Decklist Entry**:
One line or item in a decklist, containing a card name, quantity, and optionally a set code and collector number to preserve a selected printing.

**Functional Card**:
The gameplay identity of a card, ignoring printing.

**Printing**:
A specific published version of a card, usually identified in DeckDiff by set code and collector number.

**Set**:
A named Magic release containing cards.

**Set Code**:
The short identifier for a set, such as `SOS`.

**Collector Number**:
The card's identifier within a set; with set code, it identifies a printing in DeckDiff.

**Current Decklist**:
The editable decklist in a deck workspace.

**Save**:
An explicit historical snapshot of a deck workspace.

**Latest Save**:
The most recent save in a deck workspace, used as the normal comparison point for the current decklist.

**Save History**:
The ordered collection of saves for a deck workspace.

**Category**:
A named grouping used by the deck workspace to display decklist entries.

**Diff**:
The comparison between functional cards and their quantities.

**Added**:
A diff state where a functional card exists in the compared-to decklist but not in the comparison point.

**Removed**:
A diff state where a functional card exists in the comparison point but not in the compared-to decklist.

**Changed**:
A diff state where a functional card exists in both sides of the diff but has a different quantity.

**Import**:
Bringing raw decklist text into a deck workspace as the current decklist; it does not create or change saves.

**Export**:
Producing decklist text from the current decklist; if no current decklist exists, DeckDiff may fall back to the latest save.

**Compare Mode**:
A deck workspace state where two saves are compared to each other instead of comparing the latest save to the current decklist.

## Relationships

- A **Deck Workspace** has one **Current Decklist**.
- A **Deck Workspace** may have one **Deck Tile Cover**.
- A **Deck Workspace** has one **Save History**.
- A **Save History** contains zero or more **Saves**.
- The **Latest Save** is the most recent **Save** in the **Save History**.
- A **Decklist** contains one or more **Decklist Entries**.
- A **Decklist Entry** refers to one **Functional Card**.
- A **Decklist Entry** may preserve one **Printing**.
- A **Deck Tile Cover** refers to one **Printing**.
- A **Printing** is identified in DeckDiff by **Set Code** and **Collector Number**.
- A **Category** groups **Decklist Entries** for display.
- A normal **Diff** compares the **Latest Save** to the **Current Decklist**.
- **Compare Mode** compares two **Saves**.
- Printing changes do not create **Added**, **Removed**, or **Changed** diff states.

## Example dialogue

> **Dev:** "If I import a decklist, does that create a save?"
> **Domain expert:** "No. Import replaces the current decklist in the deck workspace. The user must explicitly create a save."

> **Dev:** "If the user changes a card from one printing to another, should the diff show that card as changed?"
> **Domain expert:** "No. Diffing is about functional cards and quantities. Printing affects aesthetics and price, not deck function."
