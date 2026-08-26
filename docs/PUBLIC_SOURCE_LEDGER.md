# Public Source Ledger

This document tracks the external specifications, standards, and data sources utilized by the Bible-O-Star (BOS) project.

## OSIS (Open Scripture Information Standard)
- **Namespace:** `bos:` (http://bible.o.star/ontology#)
- **Role:** Canonical Reference Layer
- **Source Specification:** [OSIS 2.1.1](http://www.bibletechnologies.net/)
- **Documentation:** [CrossWire OSIS Wiki](https://wiki.crosswire.org/OSIS)
- **Key Identifiers:** `osisID`, `osisRef`
- **Address Hierarchy:** ScriptureWork -> Book -> Chapter -> Verse
- **Usage:** This layer provides the stable addressing spine for all Bible-O-Star modules without importing or storing actual scripture text, ensuring canonical interoperability.

## OSHB (Open Scriptures Hebrew Bible)
- **Namespace:** `bos:` (specifically for lemma/morphology tagging)
- **Role:** Language and Morphology Layer
- **Source Repository:** [Open Scriptures MorphHB](https://github.com/openscriptures/morphhb)
- **Licensing:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (for lemma/morphology)
- **Key Identifiers:** `lemma`, `morph`, `strongs`
- **Usage:** This layer provides the grammatical and lexical foundation for Hebrew analysis. Bible-O-Star consumes the lemma and morphological tagging from OSHB to support advanced linguistic queries and comparative analysis. In accordance with the CC BY 4.0 license, all derived works must attribute the "Open Scriptures Hebrew Bible Project."
- **Constraint:** This project specifically utilizes the OSHB metadata (lemmas and morphology) without importing or storing the underlying Hebrew text strings, maintaining a clear separation between the linguistic layer and the canonical text layer.

## OpenBible.info Cross-References
- **Namespace:** `bos:` (http://bible.o.star/ontology#)
- **Role:** Public Relation Graph Layer
- **Source:** [OpenBible.info Labs](https://www.openbible.info/labs/cross-references/)
- **Data Source:** [cross-references.zip](https://www.openbible.info/data/cross-references.zip)
- **Licensing:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Key Identifiers:** `From Verse`, `To Verse`, `Votes`
- **Usage:** This layer provides community-voted semantic connections between verses. Bible-O-Star uses this data to scaffold the relation graph, identifying thematic and narrative clusters across the canon. Attribution must be given to OpenBible.info.

## Composite Gospel Index (CGI) RDF
- **Namespace:** `bos:` (specifically for Gospel alignment and pericope modeling)
- **Role:** Synoptic Alignment Layer
- **Source Specification:** [Composite Gospel Index (CGI)](http://semanticbible.com/cgi/index.html)
- **Conceptual Model:** [SemanticBible CGI Ontology](http://semanticbible.org/ns/2005/06/cgi#)
- **Key Identifiers:** `pericopeId`, `hasSource`, `osisRef`
- **Usage:** This layer enables cross-gospel narrative alignment by mapping abstract pericopes (units of narrative/teaching) to specific textual ranges in the four Gospels. Bible-O-Star adopts the CGI pattern to support comparative Synoptic studies and chronological narrative reconstruction.
