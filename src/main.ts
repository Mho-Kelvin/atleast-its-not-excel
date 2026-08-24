import { mount } from 'svelte'
import { setAriaStrings } from 'svelte-dnd-action'
import './app.css'
import './print.css'
import App from './App.svelte'
import { dragAriaStrings } from './lib/strings'

setAriaStrings(dragAriaStrings)

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
