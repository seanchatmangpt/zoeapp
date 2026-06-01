import React from 'react';
import { View, Text, Button } from 'react-native';
import { render, act, screen, fireEvent } from '@testing-library/react-native';
import { TemporalProvider, useTimeTravel } from '../TemporalProvider';
import { MembraneChain } from '../MembraneChain';
import { TemporalNavigator } from '../TemporalNavigator';
import { blake3, canonicalStringify } from '../../../../lib/crypto/receipts';

describe('Temporal Routing', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1000);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('MembraneChain stores and retrieves receipts', () => {
    const chain = new MembraneChain();
    chain.append({ id: '1', timestamp: 100, path: '/a', state: {} });
    // Out of order append to test sorting
    chain.append({ id: '3', timestamp: 300, path: '/c', state: {} });
    chain.append({ id: '2', timestamp: 200, path: '/b', state: {} });
    
    expect(chain.getReceipts().length).toBe(3);
    expect(chain.getReceipts()[1].id).toBe('2');
    expect(chain.getReceiptAt(150)?.id).toBe('1');
    expect(chain.getReceiptAt(250)?.id).toBe('2');
    expect(chain.getReceiptAt(300)?.id).toBe('3');
    expect(chain.getReceiptAt(50)).toBeNull();
    
    chain.clear();
    expect(chain.getReceipts().length).toBe(0);
  });

  it('TemporalNavigator navigates and notifies', () => {
    const chain = new MembraneChain();
    const nav = new TemporalNavigator(chain);
    
    expect(nav.getCurrentRoute()).toBeNull();

    const cb = jest.fn();
    const unsub = nav.subscribe(cb);
    
    jest.setSystemTime(2000);
    nav.navigate('/test', { foo: 'bar' });
    expect(cb).toHaveBeenCalledTimes(1);
    
    const route = nav.getCurrentRoute();
    expect(route?.path).toBe('/test');
    expect(route?.state.foo).toBe('bar');
    expect(route?.timestamp).toBe(2000);
    
    unsub();
    
    jest.setSystemTime(3000);
    nav.navigate('/test2', {});
    expect(cb).toHaveBeenCalledTimes(1); // not called again
    
    nav.travelTo(2000);
    expect(nav.getCurrentRoute()?.path).toBe('/test');
  });

  it('TemporalNavigator travelTo throws if no state found', () => {
    const chain = new MembraneChain();
    const nav = new TemporalNavigator(chain);
    
    expect(() => nav.travelTo(500)).toThrow('No state found at timestamp 500');
  });
  
  it('TemporalNavigator notify with null route', () => {
    const chain = new MembraneChain();
    const nav = new TemporalNavigator(chain);
    
    const cb = jest.fn();
    nav.subscribe(cb);
    
    chain.clear(); 
    (nav as any).notify();
    expect(cb).not.toHaveBeenCalled();
  });

  const TestComponent = () => {
    const { currentRoute, navigate, travelTo } = useTimeTravel();
    return (
      <View>
        <Text testID="path">{currentRoute?.path || 'none'}</Text>
        <Button testID="nav-btn" title="Nav" onPress={() => navigate('/new', { a: 1 })} />
        <Button testID="nav-no-state-btn" title="NavNoState" onPress={() => navigate('/new-no-state')} />
        <Button testID="travel-btn" title="Travel" onPress={() => travelTo(2000)} />
      </View>
    );
  };

  it('TemporalProvider provides context to useTimeTravel', () => {
    const chain = new MembraneChain();
    
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useTimeTravel must be used within a TemporalProvider');
    consoleError.mockRestore();

    render(
      <TemporalProvider chain={chain}>
        <TestComponent />
      </TemporalProvider>
    );
    
    expect(screen.getByTestId('path').props.children).toBe('none');
  });

  it('TemporalProvider updates on navigate and travel', () => {
    const chain = new MembraneChain();
    render(
      <TemporalProvider chain={chain}>
        <TestComponent />
      </TemporalProvider>
    );
    
    expect(screen.getByTestId('path').props.children).toBe('none');
    
    jest.setSystemTime(2000);
    act(() => {
      fireEvent.press(screen.getByTestId('nav-btn'));
    });
    
    expect(screen.getByTestId('path').props.children).toBe('/new');
    
    jest.setSystemTime(3000);
    act(() => {
      fireEvent.press(screen.getByTestId('nav-no-state-btn'));
    });
    
    expect(screen.getByTestId('path').props.children).toBe('/new-no-state');
    
    act(() => {
      fireEvent.press(screen.getByTestId('travel-btn'));
    });
    
    expect(screen.getByTestId('path').props.children).toBe('/new');
  });

  it('TemporalProvider defaults to new MembraneChain if none provided', () => {
    const { unmount } = render(
      <TemporalProvider>
        <TestComponent />
      </TemporalProvider>
    );
    
    jest.setSystemTime(5000);
    act(() => {
      fireEvent.press(screen.getByTestId('nav-btn'));
    });
    
    expect(screen.getByTestId('path').props.children).toBe('/new');
    unmount();
  });

  it('supports timeline branching, generating BLAKE3 parent receipts, and branch-aware rollbacks', () => {
    const chain = new MembraneChain();
    const nav = new TemporalNavigator(chain);
    
    // Set system time and navigate on main branch
    jest.setSystemTime(1000);
    nav.navigate('/home', { count: 10, items: ['a'] });
    
    jest.setSystemTime(2000);
    nav.navigate('/dashboard', { count: 20, items: ['a', 'b'] });
    
    // Fork a new branch 'feature-1' at timestamp 1500 (between 1000 and 2000)
    // The state at 1500 on main should be the state at 1000: { count: 10, items: ['a'] }
    const receipt = nav.fork('feature-1', 1500);
    
    expect(receipt.type).toBe('fork');
    expect(receipt.branchId).toBe('feature-1');
    expect(receipt.parentBranchId).toBe('main');
    
    // The parent state hash should be the BLAKE3 hash of the parent state
    const expectedHash = blake3(canonicalStringify({ count: 10, items: ['a'] }));
    expect(receipt.parentStateHash).toBe(expectedHash);
    
    // Check that we can switch branch
    nav.switchBranch('feature-1');
    expect(nav.getActiveBranch()).toBe('feature-1');
    
    // In 'feature-1', currentRoute should have the forked state
    const current = nav.getCurrentRoute();
    expect(current?.state.count).toBe(10);
    
    // Navigate on 'feature-1'
    jest.setSystemTime(3000);
    nav.navigate('/feature-home', { count: 15, items: ['a', 'c'] });
    
    // Check that 'feature-1' sees its own history and ancestors
    const featureReceipts = nav.getReceiptsForBranch('feature-1');
    expect(featureReceipts.map(r => r.path)).toEqual(['/home', '/home', '/feature-home']);
    
    // Verify branch-aware travelTo
    nav.travelTo(1200);
    expect(nav.getCurrentRoute()?.path).toBe('/home');
    
    // Traveling to 2000 in 'feature-1' should still return the fork state (at 1500)
    nav.travelTo(2000);
    expect(nav.getCurrentRoute()?.state.count).toBe(10);
  });

  it('resolves conflicts deterministically during timeline merges using LWW and CRDT rules', () => {
    const chain = new MembraneChain();
    const nav = new TemporalNavigator(chain);
    
    // Setup initial common state
    jest.setSystemTime(1000);
    nav.navigate('/base', {
      valNum: 10,
      valStr: 'base',
      valArr: ['x'],
      valObj: { nestedNum: 5, nestedStr: 'nest-base' }
    });
    
    // Fork branch 'feat-a'
    jest.setSystemTime(2000);
    nav.fork('feat-a');
    nav.switchBranch('feat-a');
    nav.navigate('/a', {
      valNum: 15, // changed from 10 to 15
      valStr: 'a-modified',
      valArr: ['x', 'y'],
      valObj: { nestedNum: 8, nestedStr: 'nest-a' }
    });
    
    // Switch back to 'main'
    nav.switchBranch('main');
    // Navigate on 'main' to create concurrent changes
    jest.setSystemTime(3000);
    nav.navigate('/b', {
      valNum: 8, // changed from 10 to 8
      valStr: 'b-modified',
      valArr: ['x', 'z'],
      valObj: { nestedNum: 4, nestedStr: 'nest-b' }
    });
    
    // Merge 'feat-a' into 'main' using LWW (Last-Write-Wins)
    jest.setSystemTime(4000);
    const lwwReceipt = nav.merge('feat-a', 'main', 'LWW');
    
    expect(lwwReceipt.type).toBe('join');
    expect(lwwReceipt.state.valStr).toBe('b-modified'); // 3000 wins over 2000
    expect(lwwReceipt.state.valNum).toBe(8); // 3000 wins
    expect(lwwReceipt.state.valObj.nestedStr).toBe('nest-b'); // 3000 wins
    
    // Reset and try CRDT merge strategy
    chain.clear();
    const nav2 = new TemporalNavigator(chain);
    
    jest.setSystemTime(1000);
    nav2.navigate('/base', {
      valNum: 10,
      valStr: 'base',
      valArr: ['x'],
      valObj: { nestedNum: 5, nestedStr: 'nest-base' }
    });
    
    jest.setSystemTime(2000);
    nav2.fork('feat-crdt');
    nav2.switchBranch('feat-crdt');
    nav2.navigate('/a', {
      valNum: 15, // delta +5
      valStr: 'a-modified', // string, fallback to LWW
      valArr: ['x', 'y'], // union
      valObj: { nestedNum: 8, nestedStr: 'nest-a' } // nestedNum delta +3
    });
    
    nav2.switchBranch('main');
    jest.setSystemTime(3000);
    nav2.navigate('/b', {
      valNum: 8, // delta -2
      valStr: 'b-modified',
      valArr: ['x', 'z'], // union
      valObj: { nestedNum: 4, nestedStr: 'nest-b' } // nestedNum delta -1
    });
    
    jest.setSystemTime(4000);
    const crdtReceipt = nav2.merge('feat-crdt', 'main', 'CRDT');
    
    // For valNum: 10 + (15 - 10) + (8 - 10) = 13
    expect(crdtReceipt.state.valNum).toBe(13);
    
    // For valArr: union of ['x', 'y'] and ['x', 'z']
    expect(crdtReceipt.state.valArr).toContain('x');
    expect(crdtReceipt.state.valArr).toContain('y');
    expect(crdtReceipt.state.valArr).toContain('z');
    expect(crdtReceipt.state.valArr.length).toBe(3);
    
    // For valObj.nestedNum: 5 + (8 - 5) + (4 - 5) = 7
    expect(crdtReceipt.state.valObj.nestedNum).toBe(7);
    
    // For valStr: main wins
    expect(crdtReceipt.state.valStr).toBe('b-modified');
  });

  it('enforces strict typestate boundaries using Claimed and Witnessed', () => {
    const chain = new MembraneChain();
    const nav = new TemporalNavigator(chain);
    
    const { claimValue } = require('../types');
    const claimedState = claimValue({ title: 'unverified transition', count: 1 });
    
    const witnessed = nav.witness(claimedState, '/verified');
    
    expect(witnessed.__brand).toBe('Witnessed');
    expect(witnessed.value.title).toBe('unverified transition');
    expect(witnessed.receipt.path).toBe('/verified');
    expect(witnessed.receipt.state.title).toBe('unverified transition');
  });
});
