/**
 * jsdom 29 ships <dialog> without showModal/close, so the real component would
 * throw in every test that opens one. The shim does what the browser does to
 * the parts a test can observe: the open attribute and the cancel event.
 */
const dialog = HTMLDialogElement.prototype as HTMLDialogElement & {
  showModal?: () => void
  close?: () => void
}

if (typeof dialog.showModal !== 'function') {
  dialog.showModal = function showModal(this: HTMLDialogElement): void {
    this.open = true
  }

  dialog.close = function close(this: HTMLDialogElement): void {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
