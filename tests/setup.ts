import { afterEach } from 'vitest';

/** Browser-only setup. Server tests run in the node environment, where there is no window. */
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // jsdom does not implement showModal / close for HTMLDialogElement
  if (
    typeof HTMLDialogElement !== 'undefined' &&
    typeof HTMLDialogElement.prototype.showModal !== 'function'
  ) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      (this as HTMLDialogElement).setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}
