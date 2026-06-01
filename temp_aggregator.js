#!/usr/bin/env node

/**
 * AALST_REPLAY_AGGREGATOR: Wil van der Aalst Compliant OCEL 2.0 Aggregator
 * 
 * This script aggregates object-centric event logs from multiple Truex receipts
 * into a single master OCEL file for historical process mining.
 */

const fs = require('fs');
const path = require('path');

const REPLAYS_DIR = '/Users/sac/zoeapp/replays';
const OUTPUT_FILE = '/Users/sac/zoeapp/master_conversation.ocel';

function aggregate() {
  console.log('[AGGREGATOR] Starting aggregation of .json replays...');
  
  if (!fs.existsSync(REPLAYS_DIR)) {
    console.error(`[ERROR] Replays directory not found: ${REPLAYS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(REPLAYS_DIR).filter(f => f.endsWith('.json'));
  console.log(`[AGGREGATOR] Found ${files.length} replay files.`);

  const allEvents = [];
  const allObjects = new Map();
  const eventTypes = new Set();
  const objectTypes = new Set();

  files.forEach(file => {
    const filePath = path.join(REPLAYS_DIR, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const receiptId = content.receiptId;
      
      // Navigate to the OCEL 2.0 payload
      const ocel2 = content.input && content.input.ocel2;
      const eventLog = ocel2 && ocel2.event_log;

      if (eventLog) {
        const { events, objects } = eventLog;
        
        // Map objects to avoid global ID collisions by prefixing with receiptId
        (objects || []).forEach(obj => {
          const newId = `${receiptId}_${obj.id}`;
          if (!allObjects.has(newId)) {
            allObjects.set(newId, {
              ...obj,
              id: newId
            });
            objectTypes.add(obj.type);
          }
        });

        // Map events and update OMAP references
        (events || []).forEach(ev => {
          const newId = `${receiptId}_${ev.id}`;
          const newOmap = (ev.omap || []).map(oid => `${receiptId}_${oid}`);
          allEvents.push({
            ...ev,
            id: newId,
            omap: newOmap
          });
          eventTypes.add(ev.activity);
        });
      }
    } catch (err) {
      console.warn(`[WARN] Failed to process ${file}: ${err.message}`);
    }
  });

  const masterOcel = {
    event_log: {
      events: allEvents,
      objects: Array.from(allObjects.values()),
      event_types: Array.from(eventTypes).map(t => ({ name: t })),
      object_types: Array.from(objectTypes).map(t => ({ name: t })),
      metadata: {
        aggregator: 'AALST_REPLAY_AGGREGATOR_V3',
        generated_at: new Date().toISOString(),
        source_count: files.length
      }
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterOcel, null, 2));
  
  console.log('-------------------------------------------------');
  console.log(`Successfully generated master OCEL log.`);
  console.log(`Target: ${OUTPUT_FILE}`);
  console.log(`Events: ${allEvents.length}`);
  console.log(`Objects: ${allObjects.size}`);
  console.log(`Event Types: ${eventTypes.size}`);
  console.log(`Object Types: ${objectTypes.size}`);
  console.log('-------------------------------------------------');
}

if (require.main === module) {
  aggregate();
}
