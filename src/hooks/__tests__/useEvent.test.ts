import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEvent } from '../useEvent';
import { VirtualKnowledgeGraphClient } from '../../lib/vkg/client';

jest.mock('../../lib/vkg/client', () => {
  const match = jest.fn();
  const quadsToJsonLd = jest.fn();
  const jsonLdToQuads = jest.fn();
  const addQuads = jest.fn();
  const removeQuads = jest.fn();

  const MockClass = jest.fn().mockImplementation(() => ({
    match,
    quadsToJsonLd,
    jsonLdToQuads,
    addQuads,
    removeQuads,
  }));

  // Attach them to the class so tests can access them!
  (MockClass as any).mockMatch = match;
  (MockClass as any).mockQuadsToJsonLd = quadsToJsonLd;
  (MockClass as any).mockJsonLdToQuads = jsonLdToQuads;
  (MockClass as any).mockAddQuads = addQuads;
  (MockClass as any).mockRemoveQuads = removeQuads;

  return {
    VirtualKnowledgeGraphClient: MockClass,
  };
});

jest.mock('../../lib/vkg/rdf', () => {
  return {
    DataFactory: {
      namedNode: jest.fn((val) => ({ type: 'NamedNode', value: val })),
    },
  };
});

const mockMatch = (VirtualKnowledgeGraphClient as any).mockMatch;
const mockQuadsToJsonLd = (VirtualKnowledgeGraphClient as any).mockQuadsToJsonLd;
const mockJsonLdToQuads = (VirtualKnowledgeGraphClient as any).mockJsonLdToQuads;
const mockAddQuads = (VirtualKnowledgeGraphClient as any).mockAddQuads;
const mockRemoveQuads = (VirtualKnowledgeGraphClient as any).mockRemoveQuads;

describe('useEvent hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize correctly when no id is provided', async () => {
    const { result } = renderHook(() => useEvent());

    expect(result.current.node).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    // Calling mutate without id throws error
    await expect(result.current.mutate({ name: 'Test' } as any)).rejects.toThrow(
      'Cannot mutate node without a valid identifier.'
    );

    // Calling remove without id does nothing
    await act(async () => {
      await result.current.remove();
    });
    expect(mockRemoveQuads).not.toHaveBeenCalled();
  });

  it('should fetch node and set state when type is missing', async () => {
    mockMatch.mockResolvedValue([]); // No type quads

    const { result } = renderHook(() => useEvent('test-id'));

    expect(result.current.loading).toBe(true); // Initially loading

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockMatch).toHaveBeenCalledTimes(1); // Only type query
  });

  it('should fetch node successfully when type is present', async () => {
    mockMatch
      .mockResolvedValueOnce(['type-quad'] as any) // Type quads present
      .mockResolvedValueOnce(['node-quad'] as any); // Node quads present
      
    const mockJsonLd = { '@id': 'test-id', '@type': 'https://schema.org/Event', name: 'Test Event' };
    mockQuadsToJsonLd.mockReturnValue([mockJsonLd]);

    const { result } = renderHook(() => useEvent('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toEqual(mockJsonLd);
    expect(result.current.error).toBeNull();
    expect(mockMatch).toHaveBeenCalledTimes(2);
    expect(mockQuadsToJsonLd).toHaveBeenCalledWith(['node-quad']);
  });

  it('should handle when quadsToJsonLd returns an empty array', async () => {
    mockMatch
      .mockResolvedValueOnce(['type-quad'] as any) // Type quads present
      .mockResolvedValueOnce(['node-quad'] as any); // Node quads present
      
    // Return empty array so [jsonLd] is undefined
    mockQuadsToJsonLd.mockReturnValue([]);

    const { result } = renderHook(() => useEvent('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toBeNull(); // jsonLd || null
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Fetch failed');
    mockMatch.mockRejectedValue(error);

    const { result } = renderHook(() => useEvent('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toBeNull();
    expect(result.current.error).toEqual(error);
  });

  it('should allow refreshing the data', async () => {
    mockMatch
      .mockResolvedValueOnce(['type-quad'] as any)
      .mockResolvedValueOnce(['node-quad'] as any);
      
    const mockJsonLd = { '@id': 'test-id', '@type': 'https://schema.org/Event' };
    mockQuadsToJsonLd.mockReturnValue([mockJsonLd]);

    const { result } = renderHook(() => useEvent('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMatch).toHaveBeenCalledTimes(2);

    mockMatch.mockClear();
    mockMatch
      .mockResolvedValueOnce(['type-quad'] as any)
      .mockResolvedValueOnce(['node-quad-2'] as any);
      
    const mockJsonLd2 = { '@id': 'test-id', '@type': 'https://schema.org/Event', name: 'Updated' };
    mockQuadsToJsonLd.mockReturnValue([mockJsonLd2]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockMatch).toHaveBeenCalledTimes(2);
    expect(result.current.node).toEqual(mockJsonLd2);
  });

  it('should mutate node correctly', async () => {
    mockMatch
      .mockResolvedValueOnce(['type-quad'] as any)
      .mockResolvedValueOnce(['node-quad'] as any);
    mockQuadsToJsonLd.mockReturnValue([{ '@id': 'test-id' }]);

    const { result } = renderHook(() => useEvent('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedData = { name: 'New Event' };
    mockJsonLdToQuads.mockReturnValue(['new-quads'] as any);
    mockAddQuads.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.mutate(updatedData as any);
    });

    expect(mockJsonLdToQuads).toHaveBeenCalledWith({
      ...updatedData,
      '@id': 'test-id',
      '@type': 'https://schema.org/Event',
    });
    expect(mockAddQuads).toHaveBeenCalledWith(['new-quads']);
    expect(result.current.node).toEqual({
      ...updatedData,
      '@id': 'test-id',
      '@type': 'https://schema.org/Event',
    });
  });

  it('should remove node correctly', async () => {
    mockMatch
      .mockResolvedValueOnce(['type-quad'] as any)
      .mockResolvedValueOnce(['node-quad'] as any);
    mockQuadsToJsonLd.mockReturnValue([{ '@id': 'test-id' }]);

    const { result } = renderHook(() => useEvent('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockMatch.mockClear();
    mockMatch.mockResolvedValueOnce(['node-quads-to-remove'] as any);
    mockRemoveQuads.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.remove();
    });

    expect(mockMatch).toHaveBeenCalledWith({ type: 'NamedNode', value: 'test-id' });
    expect(mockRemoveQuads).toHaveBeenCalledWith(['node-quads-to-remove']);
    expect(result.current.node).toBeNull();
  });
});
