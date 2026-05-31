import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSermon } from '../useSermon';
import { VirtualKnowledgeGraphClient } from '../../lib/vkg/client';
import { DataFactory } from '../../lib/vkg/rdf';

jest.mock('../../lib/vkg/client', () => {
  return {
    VirtualKnowledgeGraphClient: jest.fn().mockImplementation(() => ({
      match: jest.fn(),
      quadsToJsonLd: jest.fn(),
      jsonLdToQuads: jest.fn(),
      addQuads: jest.fn(),
      removeQuads: jest.fn(),
    })),
  };
});

jest.mock('../../lib/vkg/rdf', () => ({
  DataFactory: {
    namedNode: jest.fn((id: string) => ({ type: 'NamedNode', value: id })),
  },
}));

describe('useSermon', () => {
  let mockMatch: jest.Mock;
  let mockQuadsToJsonLd: jest.Mock;
  let mockJsonLdToQuads: jest.Mock;
  let mockAddQuads: jest.Mock;
  let mockRemoveQuads: jest.Mock;

  beforeAll(() => {
    // Grab the instance created by the top-level import in useSermon.ts
    const instance = (VirtualKnowledgeGraphClient as jest.Mock).mock.results[0].value;
    mockMatch = instance.match;
    mockQuadsToJsonLd = instance.quadsToJsonLd;
    mockJsonLdToQuads = instance.jsonLdToQuads;
    mockAddQuads = instance.addQuads;
    mockRemoveQuads = instance.removeQuads;
  });

  beforeEach(() => {
    mockMatch.mockReset();
    mockQuadsToJsonLd.mockReset();
    mockJsonLdToQuads.mockReset();
    mockAddQuads.mockReset();
    mockRemoveQuads.mockReset();
  });

  it('should initialize with loading true and node null when id is provided', async () => {
    mockMatch.mockResolvedValue([]); // No quads found initially
    
    const { result } = renderHook(() => useSermon('http://example.com/sermon1'));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.node).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should initialize with loading false when no id is provided', () => {
    const { result } = renderHook(() => useSermon());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.node).toBe(null);
    expect(mockMatch).not.toHaveBeenCalled();
  });

  it('should fetch node successfully when id is provided', async () => {
    const sermonId = 'http://example.com/sermon1';
    const mockSermon = { '@id': sermonId, '@type': 'https://schema.org/Sermon', name: 'Sunday Sermon' };
    
    mockMatch.mockResolvedValueOnce(['quad1']); // Type check
    mockMatch.mockResolvedValueOnce(['quad1', 'quad2']); // Full node quads
    mockQuadsToJsonLd.mockReturnValue([mockSermon]);

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMatch).toHaveBeenCalledTimes(2);
    expect(mockQuadsToJsonLd).toHaveBeenCalledWith(['quad1', 'quad2']);
    expect(result.current.node).toEqual(mockSermon);
    expect(result.current.error).toBe(null);
  });

  it('should handle type not found (returns null node)', async () => {
    const sermonId = 'http://example.com/sermon2';
    
    mockMatch.mockResolvedValueOnce([]); // Type check fails (0 quads)

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMatch).toHaveBeenCalledTimes(1);
    expect(mockQuadsToJsonLd).not.toHaveBeenCalled();
    expect(result.current.node).toBeNull();
  });

  it('should handle undefined node in quads (fallback to null)', async () => {
    const sermonId = 'http://example.com/sermon3';
    
    mockMatch.mockResolvedValueOnce(['quad1']); // Type check passes
    mockMatch.mockResolvedValueOnce(['quad1', 'quad2']); // Quads exist
    mockQuadsToJsonLd.mockReturnValue([]); // BUT JSON-LD is empty array!

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toBeNull(); // Should fall back to null
  });

  it('should handle fetch errors gracefully', async () => {
    const sermonId = 'http://example.com/sermon4';
    const error = new Error('Network error');
    
    mockMatch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.node).toBeNull();
  });

  it('should mutate node successfully', async () => {
    const sermonId = 'http://example.com/sermon5';
    const initialSermon = { '@id': sermonId, '@type': 'https://schema.org/Sermon', name: 'Initial' };
    const updatedData = { name: 'Updated' };
    
    mockMatch.mockResolvedValueOnce(['quad1']); // Initial fetch type
    mockMatch.mockResolvedValueOnce(['quad1']); // Initial fetch node
    mockQuadsToJsonLd.mockReturnValue([initialSermon]);

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockJsonLdToQuads.mockReturnValue(['new-quad1']);
    mockAddQuads.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.mutate(updatedData);
    });

    const expectedFullNode = {
      ...updatedData,
      '@id': sermonId,
      '@type': 'https://schema.org/Sermon',
    };

    expect(mockJsonLdToQuads).toHaveBeenCalledWith(expectedFullNode);
    expect(mockAddQuads).toHaveBeenCalledWith(['new-quad1']);
    expect(result.current.node).toEqual(expectedFullNode);
  });

  it('should throw error when trying to mutate without id', async () => {
    const { result } = renderHook(() => useSermon());

    await expect(result.current.mutate({ name: 'Updated' })).rejects.toThrow('Cannot mutate node without a valid identifier.');
  });

  it('should remove node successfully', async () => {
    const sermonId = 'http://example.com/sermon6';
    const initialSermon = { '@id': sermonId, '@type': 'https://schema.org/Sermon', name: 'To Remove' };
    
    mockMatch.mockResolvedValueOnce(['quad1']); // Initial fetch type
    mockMatch.mockResolvedValueOnce(['quad1']); // Initial fetch node
    mockQuadsToJsonLd.mockReturnValue([initialSermon]);

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockMatch.mockResolvedValueOnce(['node-quads-to-remove']);
    mockRemoveQuads.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.remove();
    });

    expect(mockMatch).toHaveBeenCalledWith(DataFactory.namedNode(sermonId));
    expect(mockRemoveQuads).toHaveBeenCalledWith(['node-quads-to-remove']);
    expect(result.current.node).toBeNull();
  });

  it('should handle remove gracefully without id', async () => {
    const { result } = renderHook(() => useSermon());

    await act(async () => {
      await result.current.remove();
    });

    // Match shouldn't be called if there's no ID
    expect(mockMatch).not.toHaveBeenCalled();
  });

  it('should refresh data', async () => {
    const sermonId = 'http://example.com/sermon7';
    const mockSermon = { '@id': sermonId, '@type': 'https://schema.org/Sermon', name: 'Refreshed Sermon' };
    
    mockMatch.mockResolvedValueOnce(['quad1']); // Initial type
    mockMatch.mockResolvedValueOnce(['quad1']); // Initial full
    mockQuadsToJsonLd.mockReturnValue([{ ...mockSermon, name: 'Old' }]);

    const { result } = renderHook(() => useSermon(sermonId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockMatch.mockResolvedValueOnce(['quad2']); // Refresh type
    mockMatch.mockResolvedValueOnce(['quad2', 'quad3']); // Refresh full
    mockQuadsToJsonLd.mockReturnValue([mockSermon]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.node).toEqual(mockSermon);
    expect(mockMatch).toHaveBeenCalledTimes(4); // 2 initially + 2 for refresh
  });
});