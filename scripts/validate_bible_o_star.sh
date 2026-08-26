#!/bin/bash
# Validation script for Bible-O-Star Ontology
# Uses pyshacl to validate the ontology against the shapes.

ONTOLOGY_DIR="/Users/sac/open-ontologies/bible-o-star/ontology"
ONTOLOGY_FILE="$ONTOLOGY_DIR/nehemiah-52.ttl"
SHAPES_FILE="$ONTOLOGY_DIR/nehemiah-52-shapes.ttl"

if [ ! -f "$ONTOLOGY_FILE" ]; then
    echo "Error: Ontology file not found at $ONTOLOGY_FILE"
    exit 1
fi

if [ ! -f "$SHAPES_FILE" ]; then
    echo "Error: Shapes file not found at $SHAPES_FILE"
    exit 1
fi

echo "Validating $ONTOLOGY_FILE against $SHAPES_FILE..."

# -i owlrl: use OWLRL inference (for subClassOf etc.)
# -s: shapes file
# -f human: human readable output
pyshacl -s "$SHAPES_FILE" -i owlrl -f human "$ONTOLOGY_FILE"
