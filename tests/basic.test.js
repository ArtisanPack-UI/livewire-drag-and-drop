/**
 * Basic Test to Verify Jest Setup
 */

describe('Basic Jest Setup', () => {
  test('should work with basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBe(true);
  });

  test('should have access to Jest functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  test('should have access to global objects', () => {
    expect(global.Alpine).toBeDefined();
    expect(global.Livewire).toBeDefined();
    expect(global.createMockDragEvent).toBeDefined();
  });
});