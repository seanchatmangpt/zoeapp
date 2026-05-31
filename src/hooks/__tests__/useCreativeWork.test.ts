import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCreativeWork } from '../useCreativeWork';
import { VirtualKnowledgeGraphClient } from '../../lib/vkg/client';
import { DataFactory } from '../../lib/vkg/rdf';

jest.mock('../../lib/vkg/client');

jest.mock('../../lib/vkg/rdf', () => {
  return {
    DataFactory: {
      namedNode: jest.fn((id: string) => ({ termType: 'NamedNode', value: id })),
    },
  };
});

describe('useCreativeWork', () => {
  let mockMatch: jest.Mock;
  let mockQuadsToJsonLd: jest.Mock;
  let mockJsonLdToQuads: jest.Mock;
  let mockAddQuads: jest.Mock;
  let mockRemoveQuads: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatch = VirtualKnowledgeGraphClient.prototype.match as jest.Mock;
    mockQuadsToJsonLd = VirtualKnowledgeGraphClient.prototype.quadsToJsonLd as jest.Mock;
    mockJsonLdToQuads = VirtualKnowledgeGraphClient.prototype.jsonLdToQuads as jest.Mock;
    mockAddQuads = VirtualKnowledgeGraphClient.prototype.addQuads as jest.Mock;
    mockRemoveQuads = VirtualKnowledgeGraphClient.prototype.removeQuads as jest.Mock;
  });

  it('should initialize without id', async () => {
    const { result } = renderHook(() => useCreativeWork());
    expect(result.current.loading).toBe(false);
    expect(result.current.node).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockMatch).not.toHaveBeenCalled();
  });

  it('should fetch node successfully when found', async () => {
    mockMatch.mockResolvedValueOnce(['typeQuad']); // type match
    mockMatch.mockResolvedValueOnce(['nodeQuad']); // node match
    mockQuadsToJsonLd.mockReturnValue([{ '@id': '123', '@type': 'https://schema.org/CreativeWork', name: 'Test' }]);

    const { result } = renderHook(() => useCreativeWork('123'));
    
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toEqual({ '@id': '123', '@type': 'https://schema.org/CreativeWork', name: 'Test' });
    expect(result.current.error).toBeNull();
    expect(mockMatch).toHaveBeenCalledTimes(2);
    expect(mockQuadsToJsonLd).toHaveBeenCalledWith(['nodeQuad']);
  });

  it('should set node to null when quadsToJsonLd returns empty', async () => {
    mockMatch.mockResolvedValueOnce(['typeQuad']);
    mockMatch.mockResolvedValueOnce(['nodeQuad']);
    mockQuadsToJsonLd.mockReturnValue([]);

    const { result } = renderHook(() => useCreativeWork('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toBeNull();
  });

  it('should return null when node type is not found', async () => {
    mockMatch.mockResolvedValueOnce([]); // empty type match

    const { result } = renderHook(() => useCreativeWork('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.node).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockMatch).toHaveBeenCalledTimes(1);
    expect(mockQuadsToJsonLd).not.toHaveBeenCalled();
  });

  it('should set error when fetch fails', async () => {
    const error = new Error('Network error');
    mockMatch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreativeWork('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(error);
  });

  it('should allow fetching again (refresh)', async () => {
    mockMatch.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCreativeWork('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockMatch.mockClear();
    mockMatch.mockResolvedValueOnce(['typeQuad']);
    mockMatch.mockResolvedValueOnce(['nodeQuad']);
    mockQuadsToJsonLd.mockReturnValue([{ '@id': '123', name: 'Refresh' }]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.node).toEqual({ '@id': '123', name: 'Refresh' });
  });

  it('should mutate node when id is present', async () => {
    mockMatch.mockResolvedValueOnce([]); // Initial fetch fails
    const { result } = renderHook(() => useCreativeWork('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockJsonLdToQuads.mockReturnValue(['newQuad']);
    mockAddQuads.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.mutate({ name: 'Mutated' });
    });

    expect(mockJsonLdToQuads).toHaveBeenCalledWith({
      '@id': '123',
      '@type': 'https://schema.org/CreativeWork',
      name: 'Mutated',
    });
    expect(mockAddQuads).toHaveBeenCalledWith(['newQuad']);
    expect(result.current.node).toEqual({
      '@id': '123',
      '@type': 'https://schema.org/CreativeWork',
      name: 'Mutated',
    });
  });

  it('should throw error when trying to mutate without id', async () => {
    const { result } = renderHook(() => useCreativeWork());

    await act(async () => {
      await expect(result.current.mutate({ name: 'Mutated' })).rejects.toThrow('Cannot mutate node without a valid identifier.');
    });
  });

  it('should remove node when id is present', async () => {
    mockMatch.mockResolvedValueOnce(['typeQuad']);
    mockMatch.mockResolvedValueOnce(['nodeQuad']);
    mockQuadsToJsonLd.mockReturnValue([{ '@id': '123' }]);

    const { result } = renderHook(() => useCreativeWork('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockMatch.mockClear();
    mockMatch.mockResolvedValueOnce(['nodeQuadToRemove']);
    mockRemoveQuads.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.remove();
    });

    expect(mockMatch).toHaveBeenCalledWith({ termType: 'NamedNode', value: '123' });
    expect(mockRemoveQuads).toHaveBeenCalledWith(['nodeQuadToRemove']);
    expect(result.current.node).toBeNull();
  });

  it('should do nothing when trying to remove without id', async () => {
    const { result } = renderHook(() => useCreativeWork());

    await act(async () => {
      await result.current.remove();
    });

    expect(mockRemoveQuads).not.toHaveBeenCalled();
  });

  it('refresh without id does nothing', async () => {
    const { result } = renderHook(() => useCreativeWork());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockMatch).not.toHaveBeenCalled();
  });
});