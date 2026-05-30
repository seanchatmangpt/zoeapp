import { VirtualKnowledgeGraphClient, VKGRdfSyncEngine } from '../client';
import { DataFactory, Quad } from '../rdf';

import { db } from '../../db/db';
import { supabase } from '@/lib/supabase';

// Mock the database client structure
jest.mock('../../db/db', () => {
  const mockReturningFn = jest.fn();
  const mockValuesFn = jest.fn().mockReturnValue({ returning: mockReturningFn });
  const mockInsertFn = jest.fn().mockReturnValue({ values: mockValuesFn });

  const mockWhereSelectFn = jest.fn().mockImplementation(() => Promise.resolve([]));
  const mockFromFn = jest.fn().mockImplementation(() => {
    const promise = Promise.resolve([]);
    (promise as any).where = mockWhereSelectFn;
    return promise;
  });
  const mockSelectFn = jest.fn().mockReturnValue({ from: mockFromFn });

  const mockWhereDeleteFn = jest.fn().mockImplementation(() => Promise.resolve());
  const mockDeleteFn = jest.fn().mockImplementation(() => {
    const promise = Promise.resolve();
    (promise as any).where = mockWhereDeleteFn;
    return promise;
  });

  return {
    db: {
      insert: mockInsertFn,
      select: mockSelectFn,
      delete: mockDeleteFn,

      // Expose mock sub-functions for assertions
      _mockReturning: mockReturningFn,
      _mockValues: mockValuesFn,
      _mockInsert: mockInsertFn,
      _mockWhereSelect: mockWhereSelectFn,
      _mockFrom: mockFromFn,
      _mockSelect: mockSelectFn,
      _mockWhereDelete: mockWhereDeleteFn,
      _mockDelete: mockDeleteFn,
    },
  };
});

// Mock Supabase client supporting chainable and thenable queries
jest.mock('@/lib/supabase', () => {
  const mockUpsert = jest.fn();
  const mockDeleteEq = jest.fn();
  
  mockDeleteEq.mockImplementation(() => {
    const p = Promise.resolve({ error: null });
    (p as any).eq = mockDeleteEq;
    return p;
  });

  const mockDelete = jest.fn().mockReturnValue({ eq: mockDeleteEq });
  const mockFrom = jest.fn().mockReturnValue({
    upsert: mockUpsert,
    delete: mockDelete,
  });

  return {
    supabase: {
      from: mockFrom,
      _mockUpsert: mockUpsert,
      _mockDelete: mockDelete,
      _mockEqDelete: mockDeleteEq,
      _mockFrom: mockFrom,
    },
  };
});

// Mock SyncEngine queueJob
const mockQueueJob = jest.fn();
jest.mock('../../sync/syncEngine', () => {
  return {
    SyncEngine: class MockSyncEngine {
      public queueJob = mockQueueJob;
      public pushChanges = jest.fn();
    },
  };
});

const mockedDb = db as any;
const mockedSupabase = supabase as any;

describe('VirtualKnowledgeGraphClient (RDF.js Spec)', () => {
  let client: VirtualKnowledgeGraphClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new VirtualKnowledgeGraphClient();
  });

  describe('jsonLdToQuads', () => {
    it('parses a basic Schema.org Person JSON-LD document into standard RDF Quads', () => {
      const doc = {
        '@id': 'person:alice',
        '@type': 'Person',
        name: 'Alice Cooper',
        knows: 'person:bob',
      };

      const quadsList = client.jsonLdToQuads(doc);

      // We expect:
      // 1. type quad: (person:alice, rdf:type, schema:Person)
      // 2. name literal quad: (person:alice, schema:name, "Alice Cooper"^^string)
      // 3. knows node relation quad: (person:alice, schema:knows, person:bob)
      expect(quadsList.length).toBe(3);

      const typeQuad = quadsList.find((q) => q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
      expect(typeQuad).toBeDefined();
      expect(typeQuad?.subject.value).toBe('person:alice');
      expect(typeQuad?.object.value).toBe('https://schema.org/Person');

      const nameQuad = quadsList.find((q) => q.predicate.value === 'https://schema.org/name');
      expect(nameQuad).toBeDefined();
      expect(nameQuad?.object.termType).toBe('Literal');
      expect(nameQuad?.object.value).toBe('Alice Cooper');

      const knowsQuad = quadsList.find((q) => q.predicate.value === 'https://schema.org/knows');
      expect(knowsQuad).toBeDefined();
      expect(knowsQuad?.object.termType).toBe('NamedNode');
      expect(knowsQuad?.object.value).toBe('person:bob');
    });

    it('extracts nested objects as separate quads and links them via subject nodes', () => {
      const complexDoc = {
        '@id': 'message:1',
        '@type': 'Message',
        text: 'Semantic web is cool',
        sender: {
          '@id': 'person:sender-1',
          '@type': 'Person',
          name: 'Sender One',
        },
      };

      const quadsList = client.jsonLdToQuads(complexDoc);

      // Expected quads:
      // 1. (message:1, rdf:type, schema:Message)
      // 2. (message:1, schema:text, "Semantic web is cool")
      // 3. (person:sender-1, rdf:type, schema:Person)
      // 4. (person:sender-1, schema:name, "Sender One")
      // 5. (message:1, schema:sender, person:sender-1)
      expect(quadsList.length).toBe(5);

      const linkQuad = quadsList.find(
        (q) => q.subject.value === 'message:1' && q.predicate.value === 'https://schema.org/sender'
      );
      expect(linkQuad).toBeDefined();
      expect(linkQuad?.object.value).toBe('person:sender-1');
      expect(linkQuad?.object.termType).toBe('NamedNode');
    });

    it('correctly maps typed primitive literals like booleans and numbers', () => {
      const doc = {
        '@id': 'post:1',
        '@type': 'BlogPosting',
        isPublished: true,
        wordCount: 350,
      };

      const quadsList = client.jsonLdToQuads(doc);

      const boolQuad = quadsList.find((q) => q.predicate.value === 'https://schema.org/isPublished');
      expect(boolQuad?.object.termType).toBe('Literal');
      expect(boolQuad?.object.value).toBe('true');
      expect((boolQuad?.object as any).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#boolean');

      const numQuad = quadsList.find((q) => q.predicate.value === 'https://schema.org/wordCount');
      expect(numQuad?.object.termType).toBe('Literal');
      expect(numQuad?.object.value).toBe('350');
      expect((numQuad?.object as any).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
    });
  });

  describe('quadsToJsonLd', () => {
    it('reconstructs a nested JSON-LD document from flat RDF Quads', () => {
      const alice = DataFactory.namedNode('person:alice');
      const knows = DataFactory.namedNode('https://schema.org/knows');
      const name = DataFactory.namedNode('https://schema.org/name');
      const bob = DataFactory.namedNode('person:bob');
      const typePred = DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

      const testQuads = [
        DataFactory.quad(alice, typePred, DataFactory.namedNode('https://schema.org/Person')),
        DataFactory.quad(alice, name, DataFactory.literal('Alice')),
        DataFactory.quad(alice, knows, bob),
        DataFactory.quad(bob, typePred, DataFactory.namedNode('https://schema.org/Person')),
        DataFactory.quad(bob, name, DataFactory.literal('Bob')),
      ];

      const jsonLd = client.quadsToJsonLd(testQuads);

      expect(jsonLd.length).toBe(1);
      const root = jsonLd[0];
      expect(root['@id']).toBe('person:alice');
      expect(root['name']).toBe('Alice');
      expect(root['knows']).toEqual({
        '@id': 'person:bob',
        '@type': 'https://schema.org/Person',
        name: 'Bob',
      });
    });
  });

  describe('match', () => {
    it('queries the SQLite table filtering by subject and predicate, reconstructing RDF.js terms', async () => {
      const dbRecords = [
        {
          id: 1,
          subject: 'person:alice',
          subjectTermType: 'NamedNode',
          predicate: 'https://schema.org/name',
          objectValue: 'Alice Cooper',
          objectTermType: 'Literal',
          objectDatatype: 'http://www.w3.org/2001/XMLSchema#string',
          objectLanguage: null,
          graph: '',
          graphTermType: 'DefaultGraph',
        },
      ];

      mockedDb._mockWhereSelect.mockResolvedValueOnce(dbRecords);

      const subjectFilter = DataFactory.namedNode('person:alice');
      const predicateFilter = DataFactory.namedNode('https://schema.org/name');

      const matchedQuads = await client.match(subjectFilter, predicateFilter);

      expect(matchedQuads.length).toBe(1);
      const matched = matchedQuads[0];
      expect(matched.subject.termType).toBe('NamedNode');
      expect(matched.subject.value).toBe('person:alice');
      expect(matched.predicate.value).toBe('https://schema.org/name');
      expect(matched.object.termType).toBe('Literal');
      expect(matched.object.value).toBe('Alice Cooper');
    });
  });

  describe('addQuads', () => {
    it('writes non-duplicate quads locally and schedules a sync queue job', async () => {
      // Return empty array for matching check (signifies no duplicate exists)
      mockedDb._mockWhereSelect.mockResolvedValueOnce([]);

      const quad = DataFactory.quad(
        DataFactory.namedNode('person:alice'),
        DataFactory.namedNode('https://schema.org/name'),
        DataFactory.literal('Alice')
      );

      await client.addQuads([quad]);

      expect(mockedDb._mockInsert).toHaveBeenCalled();
      expect(mockedDb._mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'person:alice',
          predicate: 'https://schema.org/name',
          objectValue: 'Alice',
        })
      );

      expect(mockQueueJob).toHaveBeenCalledWith({
        jobType: 'RDF_ADD_QUAD',
        payload: JSON.stringify(quad),
        entityId: 'person:alice',
      });
    });
  });

  describe('removeQuads', () => {
    it('removes quads from local storage and schedules deletion sync jobs', async () => {
      const quad = DataFactory.quad(
        DataFactory.namedNode('person:alice'),
        DataFactory.namedNode('https://schema.org/name'),
        DataFactory.literal('Alice')
      );

      await client.removeQuads([quad]);

      expect(mockedDb._mockDelete).toHaveBeenCalled();
      expect(mockQueueJob).toHaveBeenCalledWith({
        jobType: 'RDF_REMOVE_QUAD',
        payload: JSON.stringify(quad),
        entityId: 'person:alice',
      });
    });
  });
});

describe('VKGRdfSyncEngine Concrete Dispatcher', () => {
  let engine: VKGRdfSyncEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new VKGRdfSyncEngine();
  });

  it('performs upsert on RDF_ADD_QUAD', async () => {
    const quad = DataFactory.quad(
      DataFactory.namedNode('person:123'),
      DataFactory.namedNode('https://schema.org/name'),
      DataFactory.literal('Sync User')
    );

    mockedSupabase._mockUpsert.mockResolvedValueOnce({ error: null });

    await (engine as any).dispatchJob({
      jobType: 'RDF_ADD_QUAD',
      payload: JSON.stringify(quad),
      entityId: 'person:123',
    });

    expect(mockedSupabase._mockFrom).toHaveBeenCalledWith('rdf_quads_ld');
    expect(mockedSupabase._mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'person:123',
        predicate: 'https://schema.org/name',
        object_value: 'Sync User',
      })
    );
  });

  it('performs delete on RDF_REMOVE_QUAD', async () => {
    const quad = DataFactory.quad(
      DataFactory.namedNode('person:123'),
      DataFactory.namedNode('https://schema.org/name'),
      DataFactory.literal('Sync User')
    );

    await (engine as any).dispatchJob({
      jobType: 'RDF_REMOVE_QUAD',
      payload: JSON.stringify(quad),
      entityId: 'person:123',
    });

    expect(mockedSupabase._mockFrom).toHaveBeenCalledWith('rdf_quads_ld');
    expect(mockedSupabase._mockDelete).toHaveBeenCalled();
    expect(mockedSupabase._mockEqDelete).toHaveBeenCalledWith('subject', 'person:123');
  });
});
