import '@testing-library/jest-dom';

const storageMock: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => storageMock[key] ?? null,
  setItem: (key: string, value: string) => {
    storageMock[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storageMock[key];
  },
  clear: () => {
    for (const key in storageMock) {
      delete storageMock[key];
    }
  },
  length: 0,
  key: (index: number) => Object.keys(storageMock)[index] ?? null,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.scrollTo
window.scrollTo = () => {};
